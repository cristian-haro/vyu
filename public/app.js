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
    isComparing: false
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
  const scriptsContainer = document.getElementById('scripts-container');

  // Terminal / Consola
  const terminalConsole = document.getElementById('terminal-console');
  const terminalStatus = document.getElementById('terminal-status');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');

  // ==========================================
  // 3. LOGICA DE NAVEGACION, ZOOM Y PAN (Sincronizada)
  // ==========================================

  // Aplicar transformación de escala y desplazamiento a las imágenes del modo Side-by-Side
  function applyTransformations() {
    const transformStr = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    imgBaseSbs.style.transform = transformStr;
    imgCurrentSbs.style.transform = transformStr;
    imgDiffSbs.style.transform = transformStr;
    
    // Actualizar texto del zoom
    zoomValueText.textContent = `${Math.round(state.zoom * 100)}%`;
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

    // Paneo con el click del mouse (Arrastrar)
    viewport.addEventListener('mousedown', (e) => {
      e.preventDefault();
      state.isPanning = true;
      state.activeViewport = viewport;
      state.startX = e.clientX - state.panX;
      state.startY = e.clientY - state.panY;
      viewport.style.cursor = 'grabbing';
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    state.panX = e.clientX - state.startX;
    state.panY = e.clientY - state.startY;
    applyTransformations();
  });

  window.addEventListener('mouseup', () => {
    if (state.isPanning) {
      state.isPanning = false;
      if (state.activeViewport) {
        state.activeViewport.style.cursor = 'grab';
      }
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
    if (!state.baselineUrl || !state.currentUrl) return;

    if (state.activeTab === 'side-by-side') {
      imgBaseSbs.src = state.baselineUrl;
      imgCurrentSbs.src = state.currentUrl;
      imgDiffSbs.src = state.diffUrl || '';
      
      // Mostrar dimensiones cuando carguen
      imgBaseSbs.onload = () => dimBaseline.textContent = `${imgBaseSbs.naturalWidth}x${imgBaseSbs.naturalHeight}px`;
      imgCurrentSbs.onload = () => dimCurrent.textContent = `${imgCurrentSbs.naturalWidth}x${imgCurrentSbs.naturalHeight}px`;
      if (imgDiffSbs.src) {
        imgDiffSbs.onload = () => dimDiff.textContent = `${imgDiffSbs.naturalWidth}x${imgDiffSbs.naturalHeight}px`;
      }
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
  // 10. GESTOR DE SCRIPTS LOCALES (Cargar y Ejecutar)
  // ==========================================

  async function loadScriptsList() {
    try {
      const response = await fetch('/api/scripts');
      const scripts = await response.json();
      
      scriptsContainer.innerHTML = '';
      
      if (scripts.length === 0) {
        scriptsContainer.innerHTML = '<p class="section-desc">No se encontraron archivos .js en <code>scripts/</code>.</p>';
        return;
      }

      scripts.forEach(script => {
        const card = document.createElement('div');
        card.className = 'script-item';
        card.innerHTML = `
          <div class="script-meta">
            <span class="script-name">${script.name}</span>
            <span class="badge badge-indigo">${(script.size / 1024).toFixed(1)} KB</span>
          </div>
          <p class="script-desc">${script.description}</p>
          <div class="script-actions">
            <button class="btn btn-secondary btn-run-script" data-name="${script.name}">Ejecutar</button>
          </div>
        `;
        scriptsContainer.appendChild(card);
      });

      // Añadir evento a los botones de ejecución
      document.querySelectorAll('.btn-run-script').forEach(btn => {
        btn.addEventListener('click', () => {
          const scriptName = btn.dataset.name;
          runScript(scriptName);
        });
      });

    } catch (e) {
      scriptsContainer.innerHTML = '<p class="section-desc text-danger">Error al cargar scripts.</p>';
    }
  }

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

  // Ejecutar script con lectura de stream chunked en tiempo real (Fetch + ReadableStream)
  async function runScript(scriptName) {
    writeToTerminal('prompt', `\n$ node scripts/${scriptName}`);
    terminalStatus.textContent = `Ejecutando ${scriptName}...`;
    
    try {
      const response = await fetch('/api/scripts/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName })
      });

      if (!response.ok) {
        const errorText = await response.text();
        writeToTerminal('stderr', `Fallo al iniciar el script: ${errorText}`);
        return;
      }

      // Leer el cuerpo de la respuesta en streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // El servidor devuelve SSE: event: x\ndata: y\n\n
        const events = buffer.split('\n\n');
        buffer = events.pop(); // Dejar el fragmento incompleto en el buffer

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;

          // Parsear las líneas del evento
          const lines = rawEvent.split('\n');
          let eventType = '';
          let eventData = null;

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              try {
                eventData = JSON.parse(line.replace('data:', '').trim());
              } catch (e) {
                // Error al parsear JSON
              }
            }
          }

          // Procesar el evento
          if (eventType && eventData) {
            if (eventType === 'status') {
              writeToTerminal('status', `[STATUS] ${eventData.msg}`);
            } else if (eventType === 'stdout') {
              writeToTerminal('stdout', eventData.text);
            } else if (eventType === 'stderr') {
              writeToTerminal('stderr', eventData.text);
            } else if (eventType === 'done') {
              terminalStatus.textContent = `Finalizado (Código ${eventData.code})`;
              
              // Si el script generó imágenes nuevas, cargarlas en la UI
              if (eventData.files && eventData.files.length > 0) {
                const latestFile = eventData.files[0];
                writeToTerminal('system', `Imagen autogenerada detectada: ${latestFile.name}`);
                
                // Recargar historial y auto-seleccionar la última comparación (que estará de primera)
                loadHistoryList(true);
              }
            }
          }
        }
      }

    } catch (e) {
      writeToTerminal('stderr', `Fallo crítico de conexión: ${e.message}`);
      terminalStatus.textContent = 'Error de conexión';
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
  btnClearTerminal.addEventListener('click', () => {
    terminalConsole.innerHTML = '';
    writeToTerminal('system', 'Terminal limpia.');
  });


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
  // 12. INICIALIZACIÓN
  // ==========================================
  
  // 1. Cargar scripts disponibles al abrir
  loadScriptsList();

  // 2. Cargar historial de diffs
  loadHistoryList();

  // 3. Iniciar ping de salud constante
  checkServerHealth();
  setInterval(checkServerHealth, 5000);
  


});
