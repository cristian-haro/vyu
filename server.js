const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
let pixelmatch = require('pixelmatch');
if (pixelmatch.default) pixelmatch = pixelmatch.default;
const PNG = require('pngjs').PNG;

function resizePNG(png, targetWidth, targetHeight) {
  const newPng = new PNG({ width: targetWidth, height: targetHeight });
  const w1 = png.width;
  const h1 = png.height;
  const w2 = targetWidth;
  const h2 = targetHeight;
  
  const getPixel = (x, y) => {
    const cx = Math.max(0, Math.min(x, w1 - 1));
    const cy = Math.max(0, Math.min(y, h1 - 1));
    const idx = (cy * w1 + cx) * 4;
    return [
      png.data[idx],
      png.data[idx + 1],
      png.data[idx + 2],
      png.data[idx + 3]
    ];
  };

  const xRatio = w1 / w2;
  const yRatio = h1 / h2;

  for (let i = 0; i < h2; i++) {
    for (let j = 0; j < w2; j++) {
      const srcX = (j + 0.5) * xRatio - 0.5;
      const srcY = (i + 0.5) * yRatio - 0.5;
      
      const x = Math.floor(srcX);
      const y = Math.floor(srcY);
      
      const xDiff = srcX - x;
      const yDiff = srcY - y;
      
      const p00 = getPixel(x, y);
      const p10 = getPixel(x + 1, y);
      const p01 = getPixel(x, y + 1);
      const p11 = getPixel(x + 1, y + 1);
      
      const dstIdx = (i * w2 + j) * 4;
      for (let c = 0; c < 4; c++) {
        const val = p00[c] * (1 - xDiff) * (1 - yDiff) +
                    p10[c] * xDiff * (1 - yDiff) +
                    p01[c] * (1 - xDiff) * yDiff +
                    p11[c] * xDiff * yDiff;
        newPng.data[dstIdx + c] = Math.round(val);
      }
    }
  }
  
  return newPng;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar directorios necesarios
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const DATA_DIR = path.join(__dirname, 'data');
const SAMPLES_DIR = path.join(DATA_DIR, 'samples');
const COMPARISONS_DIR = path.join(DATA_DIR, 'comparisons');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

[SCRIPTS_DIR, DATA_DIR, SAMPLES_DIR, COMPARISONS_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Configurar multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// API: Listar scripts en la carpeta scripts/
app.get('/api/scripts', (req, res) => {
  try {
    if (!fs.existsSync(SCRIPTS_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(SCRIPTS_DIR)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(SCRIPTS_DIR, file);
        const stats = fs.statSync(filePath);
        // Leer una pequeña descripción del script (primeras líneas de comentarios si existen)
        let description = 'Sin descripción.';
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const match = content.match(/\/\*\*([\s\S]*?)\*\//) || content.match(/\/\/(.*)/);
          if (match) {
            description = match[1].replace(/\*|\r/g, '').trim().split('\n')[0];
          }
        } catch (e) {
          // Ignorar errores de lectura
        }

        return {
          name: file,
          size: stats.size,
          mtime: stats.mtime,
          description
        };
      });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los scripts: ' + error.message });
  }
});

// API: Ejecutar un script específico transmitiendo los logs en vivo
app.post('/api/scripts/run', (req, res) => {
  const { scriptName } = req.body;
  if (!scriptName) {
    return res.status(400).json({ error: 'Nombre de script no especificado' });
  }

  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'El script no existe en la carpeta scripts/' });
  }

  // Establecer respuesta en streaming/chunked para SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('status', { msg: `Iniciando script: node ${scriptName}...` });

  // Ejecutar el script como un proceso hijo
  // Pasamos rutas absolutas como argumentos para que los scripts sepan dónde guardar las cosas si es necesario
  const child = spawn('node', [scriptPath], {
    cwd: __dirname,
    env: {
      ...process.env,
      DATA_DIR: DATA_DIR,
      SAMPLES_DIR: SAMPLES_DIR,
      COMPARISONS_DIR: COMPARISONS_DIR
    }
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        sendEvent('stdout', { text: line });
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        sendEvent('stderr', { text: line });
      }
    });
  });

  child.on('close', (code) => {
    sendEvent('status', { msg: `Script finalizado con código de salida: ${code}` });
    
    // Escanear si hay nuevas imágenes en data/comparisons creadas recientemente
    // y enviarlas para que la interfaz las visualice automáticamente.
    let generatedFiles = [];
    try {
      const files = fs.readdirSync(COMPARISONS_DIR);
      const now = Date.now();
      generatedFiles = files
        .map(file => {
          const filePath = path.join(COMPARISONS_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            url: `/data/comparisons/${file}`,
            mtime: stats.mtime.getTime()
          };
        })
        // Filtrar archivos modificados en los últimos 20 segundos
        .filter(f => now - f.mtime < 20000)
        .sort((a, b) => b.mtime - a.mtime);
    } catch (e) {
      // Ignorar errores al leer archivos
    }

    sendEvent('done', { code, files: generatedFiles });
    res.end();
  });

  child.on('error', (err) => {
    sendEvent('status', { msg: `Error al iniciar el proceso: ${err.message}` });
    sendEvent('done', { code: -1, error: err.message });
    res.end();
  });
});

// API: Listar imágenes disponibles en samples y comparisons
app.get('/api/images', (req, res) => {
  try {
    const samples = fs.readdirSync(SAMPLES_DIR)
      .filter(file => /\.(png|jpe?g)$/i.test(file))
      .map(file => ({ name: file, url: `/data/samples/${file}`, type: 'sample' }));

    const comparisons = fs.readdirSync(COMPARISONS_DIR)
      .filter(file => /\.(png|jpe?g)$/i.test(file))
      .map(file => {
        const filePath = path.join(COMPARISONS_DIR, file);
        const stats = fs.statSync(filePath);
        
        // Cargar metadata si existe
        const baseName = file.substring(0, file.lastIndexOf('.'));
        const jsonPath = path.join(COMPARISONS_DIR, `${baseName}.json`);
        let meta = null;
        if (fs.existsSync(jsonPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          } catch (e) {
            // Ignorar errores de parseo
          }
        }

        return {
          name: file,
          url: `/data/comparisons/${file}`,
          type: 'comparison',
          mtime: stats.mtime,
          meta
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    res.json({ samples, comparisons });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar imágenes: ' + error.message });
  }
});

// API: Comparar directamente dos imágenes (Quick Compare o con imágenes del servidor)
app.post('/api/compare', upload.fields([
  { name: 'baseline', maxCount: 1 },
  { name: 'current', maxCount: 1 }
]), (req, res) => {
  try {
    let baselinePath = '';
    let currentPath = '';
    
    // Obtener parámetros
    const threshold = parseFloat(req.body.threshold ?? 0.1);
    const includeAA = req.body.includeAA === 'true' || req.body.includeAA === true;
    
    // Parsear el color de diferencia (por defecto rojo [255, 0, 0])
    let aaColor = [255, 255, 0];
    let diffColor = [255, 0, 0];
    if (req.body.diffColor) {
      try {
        const parsedColor = JSON.parse(req.body.diffColor);
        if (Array.isArray(parsedColor) && parsedColor.length === 3) {
          diffColor = parsedColor;
        }
      } catch (e) {
        // Usar valor por defecto
      }
    }

    // Verificar si se subieron archivos o si se pasaron rutas relativas
    if (req.files && req.files.baseline && req.files.current) {
      baselinePath = req.files.baseline[0].path;
      currentPath = req.files.current[0].path;
    } else if (req.body.baselineUrl && req.body.currentUrl) {
      // Eliminar el prefijo '/data/' para obtener la ruta local correcta
      const cleanBase = req.body.baselineUrl.replace(/^\/data\//, '');
      const cleanCurrent = req.body.currentUrl.replace(/^\/data\//, '');
      baselinePath = path.join(DATA_DIR, cleanBase);
      currentPath = path.join(DATA_DIR, cleanCurrent);
    } else {
      return res.status(400).json({ error: 'Debes proporcionar dos imágenes para comparar (subidas o URLs de servidor)' });
    }

    if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) {
      return res.status(404).json({ error: `Rutas de archivo no válidas: Baseline: ${fs.existsSync(baselinePath)}, Current: ${fs.existsSync(currentPath)}` });
    }

    // Leer imágenes PNG
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    let img2 = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = img1;
    
    // Redimensionar la imagen Current si las dimensiones no coinciden
    if (width !== img2.width || height !== img2.height) {
      console.log(`[RESIZE] Las dimensiones no coinciden. Redimensionando Current de ${img2.width}x${img2.height} a ${width}x${height}`);
      img2 = resizePNG(img2, width, height);
    }

    const diff = new PNG({ width, height });

    // Ejecutar pixelmatch
    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      {
        threshold,
        includeAA,
        aaColor,
        diffColor
      }
    );

    // Guardar el resultado en data/comparisons
    const comparisonId = `diff-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    const diffOutputPath = path.join(COMPARISONS_DIR, comparisonId);
    
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
    const finalBaselineUrl = req.files ? `/data/uploads/${path.basename(baselinePath)}` : req.body.baselineUrl;
    const finalCurrentUrl = req.files ? `/data/uploads/${path.basename(currentPath)}` : req.body.currentUrl;

    // Guardar metadata JSON de la comparación
    const jsonOutputPath = path.join(COMPARISONS_DIR, `${comparisonId.substring(0, comparisonId.lastIndexOf('.'))}.json`);
    const metadata = {
      baselineUrl: finalBaselineUrl,
      currentUrl: finalCurrentUrl,
      threshold,
      includeAA,
      diffColor,
      mismatchPixels: numDiffPixels,
      mismatchPercentage: diffPercentage,
      width,
      height,
      timestamp: new Date()
    };
    fs.writeFileSync(jsonOutputPath, JSON.stringify(metadata, null, 2));

    // Si los archivos eran subidas temporales, podemos decidir borrarlos o dejarlos
    // En este caso los dejamos en uploads por si el usuario quiere consultarlos.

    res.json({
      success: true,
      diffImageUrl: `/data/comparisons/${comparisonId}`,
      mismatchPixels: numDiffPixels,
      mismatchPercentage: diffPercentage,
      width,
      height,
      baselineUrl: finalBaselineUrl,
      currentUrl: finalCurrentUrl,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({ error: 'Fallo al procesar pixelmatch: ' + error.message });
  }
});

// API: Checkear salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Vyú iniciado en http://localhost:${PORT}`);
  console.log(`Carpeta de Scripts: ${SCRIPTS_DIR}`);
  console.log(`Carpeta de Datos: ${DATA_DIR}`);
  console.log(`==================================================`);
});
