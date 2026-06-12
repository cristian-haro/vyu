/* ==========================================================================
   INTERACCIONES LÓGICAS - VYÚ (Vanilla JS Frontend)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  const state = {
    // Rutas de imágenes activas en el visualizador
    baselineUrl: '',
    currentUrl: '',
    diffUrl: '',
    
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


  // ==========================================
  // 8. COMUNICACIÓN CON EL SERVIDOR (APIs)
  // ==========================================



  // Ejecutar comparación rápida (Upload FormData)
  btnQuickCompare.addEventListener('click', async () => {
    if (!state.baselineFile || !state.currentFile) return;

    try {
      btnQuickCompare.setAttribute('disabled', 'true');
      btnQuickCompare.querySelector('span').textContent = 'Comparando...';
      writeToTerminal('system', 'Subiendo imágenes y ejecutando pixelmatch...');

      const formData = new FormData();
      formData.append('baseline', state.baselineFile);
      formData.append('current', state.currentFile);
      formData.append('threshold', state.threshold);
      formData.append('includeAA', state.includeAA);
      formData.append('diffColor', JSON.stringify(state.diffColor));

      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        writeToTerminal('stderr', `[ERROR] ${data.error}`);
        btnQuickCompare.removeAttribute('disabled');
        btnQuickCompare.querySelector('span').textContent = 'Ejecutar Comparación Rápida';
        return;
      }

      state.baselineUrl = data.baselineUrl;
      state.currentUrl = data.currentUrl;
      state.diffUrl = data.diffImageUrl;

      updateImagesInDOM();
      displayResultsBar(data);

      writeToTerminal('stdout', `[COMPARACIÓN LISTA]`);
      writeToTerminal('stdout', `Diferencia detectada: ${data.mismatchPixels} píxeles (${data.mismatchPercentage}%)`);
      
    } catch (e) {
      writeToTerminal('stderr', `Fallo en la llamada de red: ${e.message}`);
    } finally {
      btnQuickCompare.removeAttribute('disabled');
      btnQuickCompare.querySelector('span').textContent = 'Ejecutar Comparación Rápida';
    }
  });

  // Re-comparar con parámetros actualizados
  btnRecompare.addEventListener('click', async () => {
    if (!state.baselineUrl || !state.currentUrl) {
      writeToTerminal('system', 'Primero carga imágenes utilizando las muestras o subiendo archivos.');
      return;
    }

    try {
      btnRecompare.setAttribute('disabled', 'true');
      writeToTerminal('system', `Actualizando Pixelmatch (Threshold: ${state.threshold} | includeAA: ${state.includeAA})...`);

      const payload = {
        baselineUrl: state.baselineUrl,
        currentUrl: state.currentUrl,
        threshold: state.threshold,
        includeAA: state.includeAA,
        diffColor: JSON.stringify(state.diffColor)
      };

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        writeToTerminal('stderr', `[API ERROR] ${data.error}`);
        return;
      }

      state.diffUrl = data.diffImageUrl;
      updateImagesInDOM();
      displayResultsBar(data);

      writeToTerminal('stdout', `[ACTUALIZADO] Píxeles discrepantes: ${data.mismatchPixels} (${data.mismatchPercentage}%)`);

    } catch (e) {
      writeToTerminal('stderr', `Error de red al actualizar: ${e.message}`);
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
      const response = await fetch('/api/images');
      const data = await response.json();
      const comparisons = data.comparisons || [];

      historyContainer.innerHTML = '';

      if (comparisons.length === 0) {
        historyContainer.innerHTML = '<p class="section-desc" style="text-align: center; color: #475569; padding: 10px;">Ninguna comparación previa.</p>';
        return;
      }

      comparisons.forEach(comp => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(comp.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
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
          <div class="history-item-meta">
            <span class="history-item-name" title="${comp.name}">${comp.name}</span>
            <span class="history-item-metric ${passClass}">${passText}</span>
          </div>
          <div class="history-item-details">
            <span>Hora: ${date}</span>
            <span>Tipo: ${comp.meta ? 'Directo' : 'Script'}</span>
          </div>
          ${metaHtml}
        `;
        
        item.addEventListener('click', () => {
          // Restaurar este diff al visualizador
          writeToTerminal('system', `Restaurando comparación histórica: ${comp.name}`);
          
          if (comp.meta) {
            // Si tiene metadata, restaurar estado completo
            state.baselineUrl = comp.meta.baselineUrl;
            state.currentUrl = comp.meta.currentUrl;
            state.diffUrl = comp.url;
            
            // Restaurar parámetros visuales en UI
            state.threshold = comp.meta.threshold;
            rangeThreshold.value = comp.meta.threshold;
            valThreshold.textContent = comp.meta.threshold.toFixed(2);
            
            state.includeAA = comp.meta.includeAA;
            chkIncludeAA.checked = comp.meta.includeAA;
            
            if (comp.meta.diffColor) {
              state.diffColor = comp.meta.diffColor;
              // Activar botón del color correspondiente
              colorDots.forEach(dot => {
                const dotColor = JSON.parse(dot.dataset.color);
                if (JSON.stringify(dotColor) === JSON.stringify(comp.meta.diffColor)) {
                  colorDots.forEach(d => d.classList.remove('active'));
                  dot.classList.add('active');
                }
              });
            }
            
            // Renderizar imágenes
            updateImagesInDOM();
            
            // Renderizar barra inferior
            displayResultsBar({
              mismatchPixels: comp.meta.mismatchPixels,
              mismatchPercentage: comp.meta.mismatchPercentage,
              diffImageUrl: comp.url
            });
          } else {
            // Fallback para diffs sin metadata
            state.baselineUrl = '';
            state.currentUrl = '';
            state.diffUrl = comp.url;
            updateImagesInDOM();
            writeToTerminal('stderr', 'Este diff no contiene metadatos de comparación completos.');
          }
        });
        
        historyContainer.appendChild(item);
      });

      // Auto-click al primer elemento si se solicita
      if (autoClickFirst && comparisons.length > 0) {
        const firstItem = historyContainer.querySelector('.history-item');
        if (firstItem) {
          firstItem.click();
        }
      }
    } catch (e) {
      historyContainer.innerHTML = '<p class="section-desc text-danger">Error al cargar historial.</p>';
    }
  }

  // Evaluar imágenes actuales en el visualizador
  async function reEvaluateCurrentState() {
    if (!state.baselineUrl || !state.currentUrl) return;
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baselineUrl: state.baselineUrl,
        currentUrl: state.currentUrl,
        threshold: state.threshold,
        includeAA: state.includeAA,
        diffColor: JSON.stringify(state.diffColor)
      })
    });
    const data = await response.json();
    if (!data.error) {
      displayResultsBar(data);
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
        statusText.textContent = `Servidor Activo (Puerto 3000)`;
        statusText.style.color = '#34d399';
      } else {
        throw new Error();
      }
    } catch (e) {
      indicator.className = 'status-indicator offline';
      statusText.textContent = 'Servidor Inactivo / Desconectado';
      statusText.style.color = '#ff5577';
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


  // ==========================================
  // 12. INICIALIZACIÓN
  // ==========================================
  
  // 1. Cargar historial de diffs
  loadHistoryList();

  // 3. Iniciar ping de salud constante
  checkServerHealth();
  setInterval(checkServerHealth, 5000);
  


});
