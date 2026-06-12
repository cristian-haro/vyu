/**
 * Script: Comparador Automatizado de Maestro
 * Descripción: Escanea de forma secuencial las capturas móviles de Maestro, las compara contra los mockups de diseño base y genera el reporte visual de regresión.
 */

const fs = require('fs');
const path = require('path');
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

console.log('==================================================');
console.log('MAESTRO INTEGRATION: Test de Regresión Visual');
console.log('==================================================');

const MAESTRO_DIR = path.join(__dirname, '..', 'data', 'maestro');
const BASELINE_DIR = path.join(MAESTRO_DIR, 'baseline');
const CURRENT_DIR = path.join(MAESTRO_DIR, 'current');
const OUT_DIR = path.join(__dirname, '..', 'data', 'comparisons');

// Asegurar que existan los directorios
[BASELINE_DIR, CURRENT_DIR, OUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Leer capturas de prueba actuales
const currentFiles = fs.readdirSync(CURRENT_DIR).filter(file => file.endsWith('.png'));

if (currentFiles.length === 0) {
  console.log('[AVISO] No se encontraron capturas de pantalla de Maestro en data/maestro/current/');
  console.log('👉 Coloca aquí las capturas generadas por tus flujos .yaml de Maestro.');
  console.log('👉 Coloca los diseños de referencia en data/maestro/baseline/');
  process.exit(0);
}

let regressionsCount = 0;

currentFiles.forEach(file => {
  const baseFile = path.join(BASELINE_DIR, file);
  const curFile = path.join(CURRENT_DIR, file);
  
  // Nombre final único
  const comparisonName = `diff-maestro-${file}`;
  const diffFile = path.join(OUT_DIR, comparisonName);
  const jsonMetaFile = path.join(OUT_DIR, `diff-maestro-${file.substring(0, file.lastIndexOf('.'))}.json`);
  
  console.log(`\nAnalizando pantalla: [${file}]`);
  
  if (!fs.existsSync(baseFile)) {
    console.error(`   [ERROR] Falta el diseño base (baseline) para: ${file}`);
    return;
  }
  
  try {
    const imgBase = PNG.sync.read(fs.readFileSync(baseFile));
    let imgCur = PNG.sync.read(fs.readFileSync(curFile));
    const { width, height } = imgBase;
    
    if (width !== imgCur.width || height !== imgCur.height) {
      console.log(`   [RESIZE] Dimensiones no coinciden. Redimensionando Current (${imgCur.width}x${imgCur.height}) a Baseline (${width}x${height})`);
      imgCur = resizePNG(imgCur, width, height);
    }
    
    const diff = new PNG({ width, height });
    
    // Ejecutar comparación visual
    const mismatchPixels = pixelmatch(
      imgBase.data,
      imgCur.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1,
        includeAA: true,
        diffColor: [255, 0, 60] // Magenta neón para resaltar el error en la UI
      }
    );
    
    fs.writeFileSync(diffFile, PNG.sync.write(diff));
    
    const diffPct = ((mismatchPixels / (width * height)) * 100).toFixed(2);
    
    // Escribir los metadatos JSON para que la interfaz web de PixelMatch Lab
    // pueda cargar y restaurar esta prueba móvil con un solo clic.
    const metadata = {
      baselineUrl: `/data/maestro/baseline/${file}`,
      currentUrl: `/data/maestro/current/${file}`,
      threshold: 0.1,
      includeAA: true,
      diffColor: [255, 0, 60],
      mismatchPixels,
      mismatchPercentage: diffPct,
      width,
      height,
      timestamp: new Date()
    };
    fs.writeFileSync(jsonMetaFile, JSON.stringify(metadata, null, 2));
    
    if (mismatchPixels > 0) {
      console.log(`   [REGRESIÓN] ${mismatchPixels.toLocaleString()} píxeles discrepantes (${diffPct}%)`);
      regressionsCount++;
    } else {
      console.log(`   [PASS] Pantalla idéntica al diseño`);
    }
  } catch (e) {
    console.error(`   [CRÍTICO] Fallo al comparar: ${e.message}`);
  }
});

console.log('\n==================================================');
console.log(`INFORME FINAL MAESTRO: ${regressionsCount} regresiones encontradas en ${currentFiles.length} pantallas.`);
console.log('==================================================');
