import pixelmatch from 'https://esm.run/pixelmatch';

// ==========================================
// DB LOCAL (IndexedDB) - ALMACENAMIENTO DE COMPARACIONES
// ==========================================
const DB_NAME = 'VyuLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'comparisons';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function saveLocalComparison(comparison) {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(comparison);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function getLocalComparisons() {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function deleteLocalComparison(id) {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

// ==========================================
// FUNCIONES AUXILIARES CLIENT-SIDE
// ==========================================
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function compareImagesClientSide(file1, file2, options) {
  const url1 = (file1 instanceof Blob) ? URL.createObjectURL(file1) : file1;
  const url2 = (file2 instanceof Blob) ? URL.createObjectURL(file2) : file2;

  try {
    const img1 = await loadImage(url1);
    const img2 = await loadImage(url2);

    const width = img1.naturalWidth;
    const height = img1.naturalHeight;

    if (width === 0 || height === 0) {
      throw new Error("Dimensiones de la imagen base inválidas.");
    }

    const canvas1 = document.createElement('canvas');
    canvas1.width = width;
    canvas1.height = height;
    const ctx1 = canvas1.getContext('2d');
    ctx1.drawImage(img1, 0, 0);

    const canvas2 = document.createElement('canvas');
    canvas2.width = width;
    canvas2.height = height;
    const ctx2 = canvas2.getContext('2d');

    if (img2.naturalWidth !== width || img2.naturalHeight !== height) {
      console.log(`[RESIZE] Redimensionando Current de ${img2.naturalWidth}x${img2.naturalHeight} a ${width}x${height}`);
      ctx2.drawImage(img2, 0, 0, width, height);
    } else {
      ctx2.drawImage(img2, 0, 0);
    }

    const img1Data = ctx1.getImageData(0, 0, width, height);
    const img2Data = ctx2.getImageData(0, 0, width, height);

    const canvasDiff = document.createElement('canvas');
    canvasDiff.width = width;
    canvasDiff.height = height;
    const ctxDiff = canvasDiff.getContext('2d');
    const diffImgData = ctxDiff.createImageData(width, height);

    const mismatchPixels = pixelmatch(
      img1Data.data,
      img2Data.data,
      diffImgData.data,
      width,
      height,
      {
        threshold: options.threshold,
        includeAA: options.includeAA,
        diffColor: options.diffColor,
        aaColor: [255, 255, 0]
      }
    );

    ctxDiff.putImageData(diffImgData, 0, 0);

    const baselineBlob = await canvasToBlob(canvas1);
    const currentBlob = await canvasToBlob(canvas2);
    const diffBlob = await canvasToBlob(canvasDiff);

    return {
      width,
      height,
      mismatchPixels,
      mismatchPercentage: ((mismatchPixels / (width * height)) * 100).toFixed(2),
      baselineBlob,
      currentBlob,
      diffBlob
    };
  } finally {
    if (file1 instanceof Blob) URL.revokeObjectURL(url1);
    if (file2 instanceof Blob) URL.revokeObjectURL(url2);
  }
}

/* ==========================================================================
   INTERACCIONES LÓGICAS - VYÚ (Vanilla JS Frontend)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Helper to revoke old state URLs
  function revokeActiveUrls() {
    if (state.baselineUrl && state.baselineUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.baselineUrl);
    }
    if (state.currentUrl && state.currentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentUrl);
    }
    if (state.diffUrl && state.diffUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.diffUrl);
    }
  }
  
  // ==========================================
  // 1. ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  const state = {
    // Rutas de imágenes activas en el visualizador
    baselineUrl: '',
    currentUrl: '',
    diffUrl: '',
    
    // Blobs reales activos
    baselineBlob: null,
    currentBlob: null,
    
    // Archivos subidos en memoria para Quick Compare
    baselineFile: null,
    currentFile: null,

    // Configuración activa del motor pixelmatch
    threshold: 0.10,
    includeAA: false,
    diffColor: [255, 0, 60], // Rojo Neón por defecto

    // Zoom & Pan Sincronizado
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    activeViewport: null, // Para saber dónde inició el arrastre

    // Historial y Vista Activa
    activeTab: 'side-by-side',
    isComparing: false,

    // Estado de Anotaciones
    activeTool: 'pan', // 'pan', 'pencil', 'rect', 'circle'
    annotationColor: '#ff003c',
    annotationThickness: 4,
    annotations: [],
    isDrawing: false,
    currentShape: null
  };

  // ==========================================
  // 2. CACHÉ DE ELEMENTOS DOM
  // ==========================================
  
  // Pestañas
  const tabs = document.querySelectorAll('.tab-btn');
  const viewModes = document.querySelectorAll('.view-mode-container');
  
  // Elementos de Imagen (Side-by-Side)
  const imgBaseSbs = document.getElementById('img-base-sbs');
  const imgCurrentSbs = document.getElementById('img-current-sbs');
  const imgDiffSbs = document.getElementById('img-diff-sbs');
  const viewportsSync = document.querySelectorAll('.viewport-sync');
  
  // Canvas de Anotación (Side-by-Side)
  const canvasBaseSbs = document.getElementById('canvas-base-sbs');
  const canvasCurrentSbs = document.getElementById('canvas-current-sbs');
  const canvasDiffSbs = document.getElementById('canvas-diff-sbs');
  const annotationToolbar = document.getElementById('annotation-toolbar');
  const toolBtns = document.querySelectorAll('.tool-btn');
  const selectThickness = document.getElementById('select-thickness');
  const annotColorDots = document.querySelectorAll('.annot-color-dot');
  const btnUndoAnnot = document.getElementById('btn-undo-annot');
  const btnClearAnnot = document.getElementById('btn-clear-annot');
  const btnDownloadConfronted = document.getElementById('btn-download-confronted');
  const btnNewCompare = document.getElementById('btn-new-compare');
  const actionControlsGroup = document.getElementById('action-controls-group');
  
  // Elementos de Imagen (Slider)
  const sliderContainer = document.getElementById('slider-container');
  const sliderOverlay = document.getElementById('slider-overlay');
  const sliderHandle = document.getElementById('slider-handle');
  const imgBaseSlider = document.getElementById('img-base-slider');
  const imgCurrentSlider = document.getElementById('img-current-slider');

  // Elementos de Imagen (Overlay)
  const imgBaseOverlay = document.getElementById('img-base-overlay');
  const imgCurrentOverlay = document.getElementById('img-current-overlay');
  const rangeOpacity = document.getElementById('range-opacity');
  const valOpacity = document.getElementById('val-opacity');

  // Dimensiones en etiquetas
  const dimBaseline = document.getElementById('dim-baseline');
  const dimCurrent = document.getElementById('dim-current');
  const dimDiff = document.getElementById('dim-diff');

  // Resultados e Indicadores
  const resMismatchPixels = document.getElementById('res-mismatch-pixels');
  const resMismatchPercentage = document.getElementById('res-mismatch-percentage');
  const resStatusBadge = document.getElementById('res-status-badge');
  const zoomValueText = document.getElementById('zoom-value');
  const btnResetZoom = document.getElementById('btn-reset-zoom');

  // Ajustes / Parámetros
  const rangeThreshold = document.getElementById('range-threshold');
  const valThreshold = document.getElementById('val-threshold');
  const chkIncludeAA = document.getElementById('chk-include-aa');
  const colorDots = document.querySelectorAll('.color-dot');
  const btnRecompare = document.getElementById('btn-recompare');

  // Cargas y Scripts
  const fileBaseline = document.getElementById('file-baseline');
  const fileCurrent = document.getElementById('file-current');
  const nameBaseline = document.getElementById('name-baseline');
  const nameCurrent = document.getElementById('name-current');
  const zoneBaseline = document.getElementById('zone-baseline');
  const zoneCurrent = document.getElementById('zone-current');
  const btnQuickCompare = document.getElementById('btn-quick-compare');
  const historyContainer = document.getElementById('history-container');
  const btnDownloadDiff = document.getElementById('btn-download-diff');
  const btnLoadDemo = document.getElementById('btn-load-demo');

  // Terminal / Consola
  const terminalConsole = document.getElementById('terminal-console');
  const terminalStatus = document.getElementById('terminal-status');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');

  // ==========================================
  // 3. LOGICA DE NAVEGACION, ZOOM Y PAN (Sincronizada) & DIBUJO
  // ==========================================

  let isSpacePressed = false;

  window.addEventListener('keydown', (e) => {
    // Si el usuario está interactuando con una entrada de texto, no interferir con la barra espaciadora
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }
    if (e.code === 'Space') {
      isSpacePressed = true;
      if (state.activeTool !== 'pan') {
        viewportsSync.forEach(vp => vp.style.cursor = 'grab');
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      updateCursor();
    }
  });

  function updateCursor() {
    viewportsSync.forEach(viewport => {
      if (state.activeTool === 'pan' || isSpacePressed) {
        viewport.style.cursor = 'grab';
      } else if (state.activeTool === 'eraser') {
        viewport.style.cursor = 'pointer';
      } else {
        viewport.style.cursor = 'crosshair';
      }
    });
  }

  // Aplicar transformación de escala y desplazamiento a las imágenes del modo Side-by-Side
  function applyTransformations() {
    const transformStr = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    imgBaseSbs.style.transform = transformStr;
    imgCurrentSbs.style.transform = transformStr;
    imgDiffSbs.style.transform = transformStr;
    
    if (canvasBaseSbs) canvasBaseSbs.style.transform = transformStr;
    if (canvasCurrentSbs) canvasCurrentSbs.style.transform = transformStr;
    if (canvasDiffSbs) canvasDiffSbs.style.transform = transformStr;
    
    // Actualizar texto del zoom
    zoomValueText.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  // Ajustar tamaño del lienzo de dibujo al tamaño natural de la imagen
  function resizeCanvases() {
    if (!imgBaseSbs || !imgBaseSbs.src || imgBaseSbs.naturalWidth === 0) return;
    const w = imgBaseSbs.naturalWidth;
    const h = imgBaseSbs.naturalHeight;
    [canvasBaseSbs, canvasCurrentSbs, canvasDiffSbs].forEach(canvas => {
      if (canvas && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    });
  }

  // Dibujar una forma individual
  function drawShape(ctx, shape) {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Efecto resplandeciente
    ctx.shadowColor = shape.color;
    ctx.shadowBlur = 6;
    
    if (shape.type === 'pencil') {
      if (shape.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.stroke();
    } else if (shape.type === 'rect') {
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
      ctx.stroke();
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (shape.type === 'text') {
      // Dibujar punto de anclaje
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, Math.max(4, shape.thickness), 0, 2 * Math.PI);
      ctx.fillStyle = shape.color;
      ctx.fill();
      
      // Dibujar caja de fondo y texto
      // Escalamos el tamaño de fuente para que sea muy legible en imágenes de alta resolución
      const fontSize = Math.max(16, shape.thickness * 8);
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      // Medir ancho
      const textWidth = ctx.measureText(shape.text).width;
      const textHeight = fontSize;
      const padding = Math.max(6, fontSize * 0.35);
      
      const boxX = shape.x + Math.max(10, fontSize * 0.5);
      const boxY = shape.y - textHeight / 2 - padding;
      const boxW = textWidth + padding * 2;
      const boxH = textHeight + padding * 2;
      
      // Dibujar la caja de fondo
      ctx.shadowBlur = 0; // Desactivar glow para bordes nítidos de texto
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = Math.max(1.5, shape.thickness * 0.4);
      ctx.stroke();
      
      // Dibujar texto
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(shape.text, boxX + padding, boxY + boxH / 2);
    }
  }

  // Calcular distancia de un punto a un segmento de línea
  function distToSegment(p, v, w) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt((p.x - projX)**2 + (p.y - projY)**2);
  }

  // Comprobar si el clic está sobre una forma dada
  function checkShapeHit(shape, x, y) {
    const threshold = Math.max(shape.thickness + 6, 12);
    
    if (shape.type === 'circle') {
      const dist = Math.sqrt((x - shape.x)**2 + (y - shape.y)**2);
      return Math.abs(dist - shape.r) <= threshold;
    }
    
    if (shape.type === 'rect') {
      const left = Math.min(shape.x, shape.x + shape.w);
      const right = Math.max(shape.x, shape.x + shape.w);
      const top = Math.min(shape.y, shape.y + shape.h);
      const bottom = Math.max(shape.y, shape.y + shape.h);
      
      const hitLeft = Math.abs(x - left) <= threshold && y >= top - threshold && y <= bottom + threshold;
      const hitRight = Math.abs(x - right) <= threshold && y >= top - threshold && y <= bottom + threshold;
      const hitTop = Math.abs(y - top) <= threshold && x >= left - threshold && x <= right + threshold;
      const hitBottom = Math.abs(y - bottom) <= threshold && x >= left - threshold && x <= right + threshold;
      return hitLeft || hitRight || hitTop || hitBottom;
    }
    
    if (shape.type === 'pencil') {
      for (let i = 0; i < shape.points.length - 1; i++) {
        const d = distToSegment({ x, y }, shape.points[i], shape.points[i+1]);
        if (d <= threshold) {
          return true;
        }
      }
    }
    
    if (shape.type === 'text') {
      const fontSize = Math.max(16, shape.thickness * 8);
      const textWidth = shape.text.length * (fontSize * 0.65);
      const textHeight = fontSize;
      const padding = Math.max(6, fontSize * 0.35);
      
      const boxX = shape.x + Math.max(10, fontSize * 0.5);
      const boxY = shape.y - textHeight / 2 - padding;
      const boxW = textWidth + padding * 2;
      const boxH = textHeight + padding * 2;
      
      const hitBox = x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + boxH;
      const distAnchor = Math.sqrt((x - shape.x)**2 + (y - shape.y)**2);
      const hitAnchor = distAnchor <= threshold;
      
      return hitBox || hitAnchor;
    }
    
    return false;
  }

  // Redibujar todas las marcas en los tres canvas
  function redrawAllCanvases() {
    const canvases = [canvasBaseSbs, canvasCurrentSbs, canvasDiffSbs];
    canvases.forEach(canvas => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      state.annotations.forEach(shape => {
        drawShape(ctx, shape);
      });
    });
  }

  // Escuchar el evento wheel en los contenedores de imagen
  viewportsSync.forEach(viewport => {
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const zoomFactor = 1.1;
      const oldZoom = state.zoom;
      
      if (e.deltaY < 0) {
        state.zoom = Math.min(state.zoom * zoomFactor, 15); // Zoom máximo 1500%
      } else {
        state.zoom = Math.max(state.zoom / zoomFactor, 0.4);  // Zoom mínimo 40%
      }
      
      // Ajustar paneo para centrar el zoom en la posición del puntero
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      
      state.panX -= mouseX * (state.zoom / oldZoom - 1);
      state.panY -= mouseY * (state.zoom / oldZoom - 1);
      
      applyTransformations();
    });

    // Paneo con el click del mouse (Arrastrar), dibujo o borrado si está activo
    viewport.addEventListener('mousedown', (e) => {
      const img = viewport.querySelector('img');
      if (!img || !img.src || img.naturalWidth === 0) return;

      // Si hacemos clic en un input de nota activo, no interferir con él
      if (e.target.classList.contains('annotation-inline-input')) {
        return;
      }
      
      e.preventDefault();
      
      if (state.activeTool !== 'pan' && !isSpacePressed) {
        const rect = img.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
        const clickY = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;

        if (state.activeTool === 'eraser') {
          // Modo Borrador: eliminar la marca clicada
          for (let i = state.annotations.length - 1; i >= 0; i--) {
            if (checkShapeHit(state.annotations[i], clickX, clickY)) {
              state.annotations.splice(i, 1);
              redrawAllCanvases();
              writeToTerminal('system', 'Marca eliminada.');
              break;
            }
          }
        } else if (state.activeTool === 'text') {
          // Modo Nota de texto
          // Si ya hay un input abierto, quitarlo
          const existingInput = document.querySelector('.annotation-inline-input');
          if (existingInput) {
            existingInput.blur();
            return;
          }

          // Crear caja de entrada inline
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'annotation-inline-input';
          input.placeholder = 'Escribe una nota...';
          
          // Posición en pantalla relativa al viewport contenedor
          const wrapperRect = viewport.getBoundingClientRect();
          input.style.left = `${e.clientX - wrapperRect.left}px`;
          input.style.top = `${e.clientY - wrapperRect.top}px`;
          
          viewport.appendChild(input);
          setTimeout(() => input.focus(), 50);

          const saveText = () => {
            const val = input.value.trim();
            if (val) {
              state.annotations.push({
                type: 'text',
                x: clickX,
                y: clickY,
                text: val,
                color: state.annotationColor,
                thickness: state.annotationThickness
              });
              redrawAllCanvases();
              writeToTerminal('system', `Nota añadida: "${val}"`);
            }
            input.remove();
          };

          input.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
              saveText();
            } else if (evt.key === 'Escape') {
              input.remove();
            }
          });

          input.addEventListener('blur', () => {
            setTimeout(() => {
              if (input.parentNode) {
                saveText();
              }
            }, 100);
          });
        } else {
          // Modo Dibujo
          state.isDrawing = true;
          
          state.currentShape = {
            type: state.activeTool,
            color: state.annotationColor,
            thickness: state.annotationThickness,
            x: clickX,
            y: clickY,
            w: 0,
            h: 0,
            r: 0,
            points: [{ x: clickX, y: clickY }]
          };
          
          state.annotations.push(state.currentShape);
        }
      } else {
        // Modo Paneo
        state.isPanning = true;
        state.activeViewport = viewport;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
        viewport.style.cursor = 'grabbing';
      }
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
      state.panX = e.clientX - state.startX;
      state.panY = e.clientY - state.startY;
      applyTransformations();
    } else if (state.isDrawing && state.currentShape) {
      const img = imgBaseSbs; // Usamos el bounding box del base ya que todos están alineados y escalados por igual
      if (!img || !img.src || img.naturalWidth === 0) return;
      
      const rect = img.getBoundingClientRect();
      const curX = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
      const curY = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;
      
      if (state.currentShape.type === 'pencil') {
        state.currentShape.points.push({ x: curX, y: curY });
      } else if (state.currentShape.type === 'rect') {
        state.currentShape.w = curX - state.currentShape.x;
        state.currentShape.h = curY - state.currentShape.y;
      } else if (state.currentShape.type === 'circle') {
        const dx = curX - state.currentShape.x;
        const dy = curY - state.currentShape.y;
        state.currentShape.r = Math.sqrt(dx * dx + dy * dy);
      }
      
      redrawAllCanvases();
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.isPanning) {
      state.isPanning = false;
      if (state.activeViewport) {
        updateCursor();
      }
    } else if (state.isDrawing) {
      state.isDrawing = false;
      state.currentShape = null;
    }
  });

  // Restaurar Zoom a valores predeterminados
  btnResetZoom.addEventListener('click', () => {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    applyTransformations();
  });


  // ==========================================
  // 4. ZOOM SINCRONIZADO / COORDINADAS FLOTANTES (Pixel Inspector)
  // ==========================================
  
  viewportsSync.forEach((viewport, index) => {
    const floatInfo = viewport.querySelector('.pixel-info-float');
    const img = viewport.querySelector('img');

    viewport.addEventListener('mousemove', (e) => {
      if (!img.src || img.src.endsWith('.html') || img.naturalWidth === 0) return;

      const rect = img.getBoundingClientRect();
      
      // Calcular coordenada X/Y relativa al tamaño natural de la imagen
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * img.naturalWidth);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * img.naturalHeight);

      if (x >= 0 && x < img.naturalWidth && y >= 0 && y < img.naturalHeight) {
        floatInfo.textContent = `X: ${x} | Y: ${y}`;
        floatInfo.style.opacity = '1';
        floatInfo.style.left = `${e.clientX - viewport.getBoundingClientRect().left + 15}px`;
        floatInfo.style.top = `${e.clientY - viewport.getBoundingClientRect().top + 15}px`;
      } else {
        floatInfo.style.opacity = '0';
      }
    });

    viewport.addEventListener('mouseleave', () => {
      floatInfo.style.opacity = '0';
    });
  });


  // ==========================================
  // 5. SELECTOR DE MODOS DE VISUALIZACIÓN (Pestañas)
  // ==========================================
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Quitar active de pestañas
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Ocultar todos los contenedores
      const mode = tab.dataset.tab;
      state.activeTab = mode;
      
      viewModes.forEach(container => {
        container.classList.remove('active');
        container.style.display = 'none';
        if (container.id === `mode-${mode}`) {
          container.classList.add('active');
          if (mode === 'side-by-side') {
            container.style.display = 'grid';
          } else {
            container.style.display = 'flex';
          }
        }
      });

      // Refrescar imágenes en la vista seleccionada
      updateImagesInDOM();
      
      // Si se activa el slider, reajustar posición al 50%
      if (mode === 'split-slider') {
        initSplitSlider();
      }
    });
  });

  // Cargar imágenes correspondientes al estado en la vista activa
  function updateImagesInDOM() {
    if (!state.baselineUrl || !state.currentUrl) {
      updateToolbarVisibility();
      return;
    }

    if (state.activeTab === 'side-by-side') {
      // Mostrar dimensiones cuando carguen (asociar antes de asignar src)
      imgBaseSbs.onload = () => {
        dimBaseline.textContent = `${imgBaseSbs.naturalWidth}x${imgBaseSbs.naturalHeight}px`;
        resizeCanvases();
        redrawAllCanvases();
      };
      imgCurrentSbs.onload = () => {
        dimCurrent.textContent = `${imgCurrentSbs.naturalWidth}x${imgCurrentSbs.naturalHeight}px`;
        resizeCanvases();
        redrawAllCanvases();
      };
      imgDiffSbs.onload = () => {
        dimDiff.textContent = `${imgDiffSbs.naturalWidth}x${imgDiffSbs.naturalHeight}px`;
        resizeCanvases();
        redrawAllCanvases();
      };

      imgBaseSbs.src = state.baselineUrl;
      imgCurrentSbs.src = state.currentUrl;
      imgDiffSbs.src = state.diffUrl || '';
    } 
    else if (state.activeTab === 'split-slider') {
      imgBaseSlider.src = state.baselineUrl;
      imgCurrentSlider.src = state.currentUrl;
    } 
    else if (state.activeTab === 'opacity-overlay') {
      imgBaseOverlay.src = state.baselineUrl;
      imgCurrentOverlay.src = state.currentUrl;
      // Ajustar opacidad según slider
      imgCurrentOverlay.style.opacity = rangeOpacity.value;
    }

    updateToolbarVisibility();
  }

  function updateToolbarVisibility() {
    if (state.baselineUrl && state.currentUrl && state.activeTab === 'side-by-side') {
      if (annotationToolbar) annotationToolbar.style.display = 'flex';
      if (actionControlsGroup) actionControlsGroup.style.display = 'flex';
      if (canvasBaseSbs) canvasBaseSbs.style.display = 'block';
      if (canvasCurrentSbs) canvasCurrentSbs.style.display = 'block';
      if (canvasDiffSbs) canvasDiffSbs.style.display = 'block';
      
      resizeCanvases();
      redrawAllCanvases();
      updateCursor();
    } else {
      if (annotationToolbar) annotationToolbar.style.display = 'none';
      if (actionControlsGroup) actionControlsGroup.style.display = 'none';
      if (canvasBaseSbs) canvasBaseSbs.style.display = 'none';
      if (canvasCurrentSbs) canvasCurrentSbs.style.display = 'none';
      if (canvasDiffSbs) canvasDiffSbs.style.display = 'none';
    }
  }

  // ==========================================
  // 6. SPLIT SLIDER DRAGGABLE (Reveal antes/después)
  // ==========================================
  
  let isDraggingSlider = false;

  function initSplitSlider() {
    // Forzar renderizado a la mitad por defecto usando máscara de clip-path
    sliderOverlay.style.clipPath = 'polygon(0 0, 50% 0, 50% 100%, 0 100%)';
    sliderHandle.style.left = '50%';
  }

  function moveSlider(clientX) {
    const rect = sliderContainer.getBoundingClientRect();
    const position = clientX - rect.left;
    let percentage = (position / rect.width) * 100;
    
    // Limitar entre 0% y 100%
    percentage = Math.max(0, Math.min(percentage, 100));

    sliderOverlay.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
    sliderHandle.style.left = `${percentage}%`;
  }

  sliderHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDraggingSlider = true;
    sliderContainer.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingSlider) return;
    moveSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingSlider) {
      isDraggingSlider = false;
      sliderContainer.classList.remove('dragging');
    }
  });

  // Soporte táctil / drag en contenedor completo para fluidez
  sliderContainer.addEventListener('click', (e) => {
    if (e.target !== sliderHandle && !sliderHandle.contains(e.target)) {
      moveSlider(e.clientX);
    }
  });

  // Opacity slider
  rangeOpacity.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    imgCurrentOverlay.style.opacity = val;
    valOpacity.textContent = `${Math.round(val * 100)}%`;
  });


  // ==========================================
  // 7. DRAG & DROP Y SELECCIÓN DE IMÁGENES RÁPIDA
  // ==========================================

  function handleFileSelection(file, type) {
    if (!file) return;
    
    if (type === 'baseline') {
      state.baselineFile = file;
      nameBaseline.textContent = file.name;
      nameBaseline.classList.add('loaded');
      zoneBaseline.style.borderColor = 'var(--indigo)';
    } else {
      state.currentFile = file;
      nameCurrent.textContent = file.name;
      nameCurrent.classList.add('loaded');
      zoneCurrent.style.borderColor = 'var(--indigo)';
    }

    // Activar botón de comparar si ambos están cargados
    if (state.baselineFile && state.currentFile) {
      btnQuickCompare.removeAttribute('disabled');
    }
  }

  // Setup drag events
  ['baseline', 'current'].forEach(type => {
    const zone = document.getElementById(`zone-${type}`);
    const input = document.getElementById(`file-${type}`);

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0], type);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length > 0) {
        handleFileSelection(input.files[0], type);
      }
    });
  });

  // Soporte para pegar imágenes desde el portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!state.baselineFile) {
          handleFileSelection(file, 'baseline');
          writeToTerminal('system', 'Imagen pegada desde el portapapeles como Baseline.');
        } else {
          handleFileSelection(file, 'current');
          writeToTerminal('system', 'Imagen pegada desde el portapapeles como Current.');
        }
        break;
      }
    }
  });

  // Cargar imágenes de ejemplo (Demo)
  async function loadDemoImages(autoRun = true) {
    try {
      writeToTerminal('system', 'Cargando imágenes de prueba (Demo)...');
      if (btnLoadDemo) {
        btnLoadDemo.style.pointerEvents = 'none';
        btnLoadDemo.style.opacity = '0.7';
      }

      // Cargar los dos SVGs de muestra
      const img1 = await loadImage('./samples/baseline.svg');
      const img2 = await loadImage('./samples/current.svg');

      const width = 800;
      const height = 520;

      const c1 = document.createElement('canvas');
      c1.width = width;
      c1.height = height;
      c1.getContext('2d').drawImage(img1, 0, 0);
      const blob1 = await canvasToBlob(c1);

      const c2 = document.createElement('canvas');
      c2.width = width;
      c2.height = height;
      c2.getContext('2d').drawImage(img2, 0, 0);
      const blob2 = await canvasToBlob(c2);

      const file1 = new File([blob1], 'dashboard_v1_baseline.png', { type: 'image/png' });
      const file2 = new File([blob2], 'dashboard_v2_current.png', { type: 'image/png' });

      handleFileSelection(file1, 'baseline');
      handleFileSelection(file2, 'current');

      writeToTerminal('system', 'Imágenes de demo cargadas.');

      if (autoRun) {
        btnQuickCompare.click();
      }
    } catch (err) {
      console.error('Error cargando demo:', err);
      writeToTerminal('stderr', `Error al cargar imágenes de prueba: ${err.message}`);
    } finally {
      if (btnLoadDemo) {
        btnLoadDemo.style.pointerEvents = 'auto';
        btnLoadDemo.style.opacity = '1';
      }
    }
  }

  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => loadDemoImages(true));
  }


  // ==========================================
  // 8. COMUNICACIÓN CON EL SERVIDOR (APIs)
  // ==========================================



  // Ejecutar comparación rápida (Local Client-Side)
  btnQuickCompare.addEventListener('click', async () => {
    if (!state.baselineFile || !state.currentFile) return;

    try {
      btnQuickCompare.setAttribute('disabled', 'true');
      btnQuickCompare.querySelector('span').textContent = 'Comparando...';
      writeToTerminal('system', 'Ejecutando pixelmatch localmente en el navegador...');

      const result = await compareImagesClientSide(
        state.baselineFile,
        state.currentFile,
        {
          threshold: state.threshold,
          includeAA: state.includeAA,
          diffColor: state.diffColor
        }
      );

      // Guardar blobs activos en el estado
      revokeActiveUrls();
      state.baselineBlob = result.baselineBlob;
      state.currentBlob = result.currentBlob;

      // Crear URLs locales
      state.baselineUrl = URL.createObjectURL(result.baselineBlob);
      state.currentUrl = URL.createObjectURL(result.currentBlob);
      state.diffUrl = URL.createObjectURL(result.diffBlob);

      // Guardar en IndexedDB
      const compId = `diff-${Date.now()}`;
      const name = `${state.baselineFile.name} vs ${state.currentFile.name}`;
      
      await saveLocalComparison({
        id: compId,
        name,
        baselineBlob: result.baselineBlob,
        currentBlob: result.currentBlob,
        diffBlob: result.diffBlob,
        timestamp: Date.now(),
        meta: {
          threshold: state.threshold,
          includeAA: state.includeAA,
          diffColor: state.diffColor,
          mismatchPixels: result.mismatchPixels,
          mismatchPercentage: result.mismatchPercentage,
          width: result.width,
          height: result.height
        }
      });

      updateImagesInDOM();
      displayResultsBar({
        mismatchPixels: result.mismatchPixels,
        mismatchPercentage: result.mismatchPercentage,
        diffImageUrl: state.diffUrl
      });

      writeToTerminal('stdout', `[COMPARACIÓN LISTA]`);
      writeToTerminal('stdout', `Diferencia detectada: ${result.mismatchPixels} píxeles (${result.mismatchPercentage}%)`);
      
    } catch (e) {
      writeToTerminal('stderr', `Fallo al comparar imágenes: ${e.message}`);
    } finally {
      btnQuickCompare.removeAttribute('disabled');
      btnQuickCompare.querySelector('span').textContent = 'Ejecutar Comparación Rápida';
    }
  });

  // Re-comparar con parámetros actualizados (Local Client-Side)
  btnRecompare.addEventListener('click', async () => {
    if (!state.baselineBlob || !state.currentBlob) {
      writeToTerminal('system', 'Primero carga imágenes subiendo archivos.');
      return;
    }

    try {
      btnRecompare.setAttribute('disabled', 'true');
      writeToTerminal('system', `Actualizando Pixelmatch localmente (Threshold: ${state.threshold} | includeAA: ${state.includeAA})...`);

      const result = await compareImagesClientSide(
        state.baselineBlob,
        state.currentBlob,
        {
          threshold: state.threshold,
          includeAA: state.includeAA,
          diffColor: state.diffColor
        }
      );

      // Actualizar URLs de visualización
      const oldDiffUrl = state.diffUrl;
      state.diffUrl = URL.createObjectURL(result.diffBlob);
      if (oldDiffUrl && oldDiffUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldDiffUrl);
      }

      // Guardar esta nueva comparación en IndexedDB
      const compId = `diff-${Date.now()}`;
      const name = `${state.baselineFile ? state.baselineFile.name : 'Imagen Base'} vs ${state.currentFile ? state.currentFile.name : 'Imagen Actual'}`;
      
      await saveLocalComparison({
        id: compId,
        name,
        baselineBlob: state.baselineBlob,
        currentBlob: state.currentBlob,
        diffBlob: result.diffBlob,
        timestamp: Date.now(),
        meta: {
          threshold: state.threshold,
          includeAA: state.includeAA,
          diffColor: state.diffColor,
          mismatchPixels: result.mismatchPixels,
          mismatchPercentage: result.mismatchPercentage,
          width: result.width,
          height: result.height
        }
      });

      updateImagesInDOM();
      displayResultsBar({
        mismatchPixels: result.mismatchPixels,
        mismatchPercentage: result.mismatchPercentage,
        diffImageUrl: state.diffUrl
      });

      writeToTerminal('stdout', `[ACTUALIZADO] Píxeles discrepantes: ${result.mismatchPixels} (${result.mismatchPercentage}%)`);

    } catch (e) {
      writeToTerminal('stderr', `Error al actualizar la comparación: ${e.message}`);
    } finally {
      btnRecompare.removeAttribute('disabled');
    }
  });

  // Visualizar barra de resultados inferior
  function displayResultsBar(data) {
    resMismatchPixels.textContent = `${data.mismatchPixels.toLocaleString()} px`;
    resMismatchPercentage.textContent = `${data.mismatchPercentage}%`;

    resStatusBadge.className = 'badge-status';
    if (data.mismatchPixels === 0) {
      resStatusBadge.textContent = 'PASS (IDÉNTICAS)';
      resStatusBadge.classList.add('badge-success');
      resMismatchPercentage.className = 'metric-value text-success';
    } else {
      resStatusBadge.textContent = 'FAIL (REGRESIÓN)';
      resStatusBadge.classList.add('badge-danger');
      resMismatchPercentage.className = 'metric-value text-warning';
    }

    // Gestionar el botón de descarga del diff
    if (data.diffImageUrl) {
      state.diffUrl = data.diffImageUrl;
      btnDownloadDiff.href = data.diffImageUrl;
      btnDownloadDiff.style.display = 'inline-block';
    } else {
      btnDownloadDiff.style.display = 'none';
    }

    // Recargar historial de comparaciones
    loadHistoryList();
  }


  // ==========================================
  // 9. CONFIGURACIONES DE PARÁMETROS
  // ==========================================

  // Deslizador de Threshold
  rangeThreshold.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.threshold = val;
    valThreshold.textContent = val.toFixed(2);
  });

  // Checkbox de Anti-Aliasing
  chkIncludeAA.addEventListener('change', (e) => {
    state.includeAA = e.target.checked;
  });

  // Selector de Color
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.diffColor = JSON.parse(dot.dataset.color);
      writeToTerminal('system', `Color de marcado cambiado a RGB: ${dot.dataset.color}`);
    });
  });


  // ==========================================
  // 10.5 GESTOR DE HISTORIAL DE DIFFS (Cargar y restaurar)
  // ==========================================
  async function loadHistoryList(autoClickFirst = false) {
    try {
      const comparisons = await getLocalComparisons();

      historyContainer.innerHTML = '';

      if (comparisons.length === 0) {
        historyContainer.innerHTML = '<p class="section-desc" style="text-align: center; color: #475569; padding: 10px;">Ninguna comparación previa.</p>';
        if (autoClickFirst) {
          loadDemoImages(true);
        }
        return;
      }

      comparisons.forEach(comp => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.position = 'relative';
        
        const date = new Date(comp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let metaHtml = '';
        let passClass = 'text-fail';
        let passText = 'REGRESIÓN';
        
        if (comp.meta) {
          const isPass = comp.meta.mismatchPixels === 0;
          passClass = isPass ? 'text-pass' : 'text-fail';
          passText = isPass ? 'PASS' : `${comp.meta.mismatchPercentage}%`;
          metaHtml = `
            <div class="history-item-details">
              <span>Threshold: ${comp.meta.threshold}</span>
              <span>Diff: ${comp.meta.mismatchPixels.toLocaleString()} px</span>
            </div>
          `;
        }

        item.innerHTML = `
          <div class="history-item-meta" style="padding-right: 24px;">
            <span class="history-item-name" title="${comp.name}">${comp.name}</span>
            <span class="history-item-metric ${passClass}">${passText}</span>
          </div>
          <div class="history-item-details">
            <span>Hora: ${date}</span>
            <span>Tipo: Local Privado</span>
          </div>
          ${metaHtml}
          <button class="delete-history-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; font-size: 0.8rem; opacity: 0.5; transition: opacity 0.2s;" title="Eliminar del historial">🗑️</button>
        `;

        const delBtn = item.querySelector('.delete-history-btn');
        delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
        delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.5');
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`¿Estás seguro de que quieres eliminar "${comp.name}" del historial?`)) {
            await deleteLocalComparison(comp.id);
            writeToTerminal('system', `Eliminada comparación histórica: ${comp.name}`);
            loadHistoryList();
          }
        });
        
        item.addEventListener('click', () => {
          writeToTerminal('system', `Restaurando comparación histórica local: ${comp.name}`);
          
          if (comp.meta) {
            revokeActiveUrls();
            
            // Guardar blobs activos en el estado
            state.baselineBlob = comp.baselineBlob;
            state.currentBlob = comp.currentBlob;
            
            // Generar URLs temporales de visualización
            state.baselineUrl = URL.createObjectURL(comp.baselineBlob);
            state.currentUrl = URL.createObjectURL(comp.currentBlob);
            state.diffUrl = URL.createObjectURL(comp.diffBlob);
            
            // Restaurar parámetros visuales en UI
            state.threshold = comp.meta.threshold;
            rangeThreshold.value = comp.meta.threshold;
            valThreshold.textContent = comp.meta.threshold.toFixed(2);
            
            state.includeAA = comp.meta.includeAA;
            chkIncludeAA.checked = comp.meta.includeAA;
            
            if (comp.meta.diffColor) {
              state.diffColor = comp.meta.diffColor;
              colorDots.forEach(dot => {
                const dotColor = JSON.parse(dot.dataset.color);
                if (JSON.stringify(dotColor) === JSON.stringify(comp.meta.diffColor)) {
                  colorDots.forEach(d => d.classList.remove('active'));
                  dot.classList.add('active');
                }
              });
            }
            
            updateImagesInDOM();
            
            displayResultsBar({
              mismatchPixels: comp.meta.mismatchPixels,
              mismatchPercentage: comp.meta.mismatchPercentage,
              diffImageUrl: state.diffUrl
            });
          }
        });
        
        historyContainer.appendChild(item);
      });

      if (autoClickFirst && comparisons.length > 0) {
        const firstItem = historyContainer.querySelector('.history-item');
        if (firstItem) {
          firstItem.click();
        }
      }
    } catch (e) {
      historyContainer.innerHTML = '<p class="section-desc text-danger">Error al cargar historial local.</p>';
    }
  }


  // ==========================================
  // 11. MANEJO DE CONSOLA / TERMINAL VIRTUAL
  // ==========================================

  function writeToTerminal(type, text) {
    console.log(`[${type}] ${text}`);
    if (!terminalConsole) return;
    
    const line = document.createElement('div');
    line.className = `terminal-line ${type === 'prompt' ? 'prompt-line' : type + '-msg'}`;
    
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    const timestampHtml = `<span style="color: #475569; margin-right: 8px; font-family: var(--font-mono); font-size: 0.65rem;">[${timeStr}]</span>`;
    
    if (type === 'prompt') {
      const cleanText = text.replace(/^\n/, '');
      line.innerHTML = `${timestampHtml}<span style="font-weight: 600;">$ ${cleanText}</span>`;
    } else {
      line.innerHTML = `${timestampHtml}<span>${text}</span>`;
    }

    terminalConsole.appendChild(line);
    
    // Scroll automático al fondo
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
  }

  // Limpiar terminal
  if (btnClearTerminal) {
    btnClearTerminal.addEventListener('click', () => {
      if (terminalConsole) terminalConsole.innerHTML = '';
      writeToTerminal('system', 'Terminal limpia.');
    });
  }


  // Ping de salud del servidor
  async function checkServerHealth() {
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        indicator.className = 'status-indicator online';
        statusText.textContent = `Modo Local Privado (Sin Subidas)`;
        statusText.style.color = '#34d399';
      } else {
        throw new Error();
      }
    } catch (e) {
      indicator.className = 'status-indicator online';
      statusText.textContent = 'Navegador Privado (100% Client-Side)';
      statusText.style.color = '#a855f7';
    }
  }


  // ==========================================
  // 11.5 MANEJO DE HERRAMIENTAS DE ANOTACIÓN
  // ==========================================

  // Seleccionar herramienta
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTool = btn.dataset.tool;
      updateCursor();
      writeToTerminal('system', `Herramienta de dibujo cambiada a: ${state.activeTool}`);
    });
  });

  // Cambiar grosor
  if (selectThickness) {
    selectThickness.addEventListener('change', (e) => {
      state.annotationThickness = parseInt(e.target.value, 10);
      writeToTerminal('system', `Grosor de línea de marca cambiado a: ${state.annotationThickness}px`);
    });
  }

  // Seleccionar color
  annotColorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      annotColorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.annotationColor = dot.dataset.color;
      writeToTerminal('system', `Color de marca cambiado a: ${state.annotationColor}`);
    });
  });

  // Deshacer (Undo)
  if (btnUndoAnnot) {
    btnUndoAnnot.addEventListener('click', () => {
      if (state.annotations.length > 0) {
        state.annotations.pop();
        redrawAllCanvases();
        writeToTerminal('system', 'Última marca deshecha.');
      } else {
        writeToTerminal('system', 'No hay marcas para deshacer.');
      }
    });
  }

  // Borrar Todo (Clear)
  if (btnClearAnnot) {
    btnClearAnnot.addEventListener('click', () => {
      if (state.annotations.length > 0) {
        state.annotations = [];
        redrawAllCanvases();
        writeToTerminal('system', 'Todas las marcas han sido eliminadas.');
      } else {
        writeToTerminal('system', 'No hay marcas para borrar.');
      }
    });
  }

  // Descargar Comparativa Enfrentada (Side-by-Side)
  if (btnDownloadConfronted) {
    btnDownloadConfronted.addEventListener('click', () => {
      if (!state.baselineUrl || !state.currentUrl) {
        writeToTerminal('stderr', 'No hay imágenes cargadas para exportar.');
        return;
      }
      
      const imgBase = imgBaseSbs;
      const imgCurrent = imgCurrentSbs;
      
      if (!imgBase.complete || !imgCurrent.complete || imgBase.naturalWidth === 0) {
        writeToTerminal('stderr', 'Las imágenes aún no se han cargado por completo.');
        return;
      }
      
      try {
        const w = imgBase.naturalWidth;
        const h = imgBase.naturalHeight;
        const gap = 20; // 20px de separación visual
        
        // Crear un canvas en memoria
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = w * 2 + gap;
        
        // Encabezado para colocar las etiquetas "BASE (V1)" y "CURRENT (V2)"
        const headerHeight = 60;
        exportCanvas.height = h + headerHeight;
        
        const ctx = exportCanvas.getContext('2d');
        
        // Fondo oscuro premium del canvas (a juego con el visualizador de Vyú)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // 1. Dibujar el encabezado izquierdo (BASE)
        ctx.fillStyle = '#818cf8'; // Color indigo
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('BASE (V1)', 20, 38);
        
        // 2. Dibujar el encabezado derecho (CURRENT)
        ctx.fillStyle = '#f472b6'; // Color rosa/pink
        ctx.fillText('CURRENT (V2)', w + gap + 20, 38);
        
        // Línea divisoria en el encabezado
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, headerHeight - 1);
        ctx.lineTo(exportCanvas.width, headerHeight - 1);
        ctx.stroke();
        
        // 3. Dibujar las dos imágenes
        ctx.drawImage(imgBase, 0, headerHeight, w, h);
        ctx.drawImage(imgCurrent, w + gap, headerHeight, w, h);
        
        // 4. Dibujar las marcas en el lado izquierdo (Base)
        ctx.save();
        ctx.translate(0, headerHeight);
        state.annotations.forEach(shape => {
          drawShape(ctx, shape);
        });
        ctx.restore();
        
        // 5. Dibujar las marcas en el lado derecho (Current)
        ctx.save();
        ctx.translate(w + gap, headerHeight);
        state.annotations.forEach(shape => {
          drawShape(ctx, shape);
        });
        ctx.restore();
        
        // 6. Exportar y descargar
        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `comparativa-enfrentada-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        writeToTerminal('stdout', 'Comparativa enfrentada generada y descargada con éxito.');
      } catch (err) {
        writeToTerminal('stderr', `Error al exportar la comparativa: ${err.message}`);
      }
    });
  }
  // Cerrar y limpiar comparativa actual (Workspace Reset)
  if (btnNewCompare) {
    btnNewCompare.addEventListener('click', () => {
      revokeActiveUrls();
      
      // Resetear estado
      state.baselineUrl = '';
      state.currentUrl = '';
      state.diffUrl = '';
      state.baselineFile = null;
      state.currentFile = null;
      state.baselineBlob = null;
      state.currentBlob = null;
      
      // Resetear inputs de archivo
      if (fileBaseline) fileBaseline.value = '';
      if (fileCurrent) fileCurrent.value = '';
      
      // Resetear nombres de archivo
      if (nameBaseline) {
        nameBaseline.textContent = 'Sin archivo';
        nameBaseline.classList.remove('loaded');
      }
      if (nameCurrent) {
        nameCurrent.textContent = 'Sin archivo';
        nameCurrent.classList.remove('loaded');
      }
      
      // Resetear bordes de zonas de carga
      if (zoneBaseline) zoneBaseline.style.borderColor = '';
      if (zoneCurrent) zoneCurrent.style.borderColor = '';
      
      // Deshabilitar botón de comparar
      if (btnQuickCompare) btnQuickCompare.setAttribute('disabled', 'true');
      
      // Resetear imágenes en el DOM
      imgBaseSbs.src = '';
      imgCurrentSbs.src = '';
      imgDiffSbs.src = '';
      if (imgBaseSlider) imgBaseSlider.src = '';
      if (imgCurrentSlider) imgCurrentSlider.src = '';
      if (imgBaseOverlay) imgBaseOverlay.src = '';
      if (imgCurrentOverlay) imgCurrentOverlay.src = '';
      
      // Limpiar marcas
      state.annotations = [];
      redrawAllCanvases();
      
      // Resetear etiquetas de dimensiones
      if (dimBaseline) dimBaseline.textContent = '-';
      if (dimCurrent) dimCurrent.textContent = '-';
      if (dimDiff) dimDiff.textContent = '-';
      
      // Resetear barra de resultados inferior
      if (resMismatchPixels) resMismatchPixels.textContent = '0 px';
      if (resMismatchPercentage) resMismatchPercentage.textContent = '0.00%';
      if (resStatusBadge) {
        resStatusBadge.textContent = 'Sin evaluar';
        resStatusBadge.className = 'badge-status';
      }
      if (btnDownloadDiff) btnDownloadDiff.style.display = 'none';
      
      // Ocultar barra de herramientas y controles
      updateToolbarVisibility();
      
      writeToTerminal('system', 'Workspace limpiado. Listo para una nueva comparación.');
    });
  }


  // ==========================================
  // 12. INICIALIZACIÓN
  // ==========================================
  
  // 1. Cargar historial de diffs o precargar demo si es la primera visita
  loadHistoryList(true);

  // 3. Iniciar ping de salud constante
  checkServerHealth();
  setInterval(checkServerHealth, 5000);
  


});
