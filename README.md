# Vyú - Workspace de Regresión Visual e Integración con Maestro

¡Bienvenido a **Vyú**! Un espacio de trabajo interactivo premium diseñado para realizar pruebas de regresión visual píxel a píxel, analizar discrepancias de diseño con herramientas visuales de anotación y verificar flujos automatizados de Maestro.

Este laboratorio visual puede ejecutarse tanto **de forma local con Node.js** como a través de **Docker**, facilitando su uso en cualquier máquina de desarrollo.

---

## 1. Ejecución Local con Node.js

Para levantar el servidor y el workspace en tu ordenador de forma nativa, sigue estos sencillos pasos:

### Prerrequisitos
* Tener instalado **Node.js** (versión 16 o superior recomendada).

### Paso 1: Instalar Dependencias
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
npm install
```

### Paso 2: Iniciar el Servidor
Inicia el servidor local de Vyú con el siguiente comando:
```bash
npm start
```
> **Nota**: El comando `npm start` levanta la aplicación en el puerto `3000` de forma nativa.

### Paso 3: ¡Listo para Usar!
Abre tu navegador e ingresa a:
**[http://localhost:3000](http://localhost:3000)**

---

## 2. Ejecución con Docker (Recomendado para equipos)

Para empaquetar y ejecutar la aplicación en un contenedor aislado, sigue estos pasos:

### 1. Construir la Imagen Docker
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
docker build -t vyu .
```

### 2. Levantar el Contenedor
Ejecuta el contenedor asociando el puerto `3000`:
```bash
docker run -d -p 3000:3000 --name vyu-workspace vyu
```

### 3. Persistencia de Datos (Opcional)
Si deseas que las imágenes comparadas (`comparisons`) y subidas se guarden de forma persistente en tu máquina local:
```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/usr/src/app/data \
  --name vyu-workspace vyu
```

---

## 3. Integración con Maestro

Vyú incluye soporte integrado para flujos de pruebas móviles de **Maestro**:
1. Coloca tus capturas base (baseline) en `data/maestro/baseline/`.
2. Guarda las capturas de prueba obtenidas con Maestro en `data/maestro/current/` con el mismo nombre.
3. Ejecuta el script de comparación desde la terminal:
   ```bash
   node scripts/compare-maestro-screens.js
   ```
4. El script redimensionará automáticamente las imágenes en caso de discrepancias de tamaño, comparará los píxeles y guardará los resultados en el **Historial de Diffs** para que puedas visualizarlos y marcarlos interactivamente desde la web de Vyú.

---

## 4. Características Principales del Workspace
* **Visualizador Side-by-Side Sincronizado**: Zoom y paneo sincronizados en las 3 columnas (Base, Current, Diff) con visualización de coordenadas en hover.
* **Herramientas de Anotación de Diseño**: Dibuja rectángulos, círculos, líneas a mano alzada y añade notas de texto para reportar regresiones específicas en las capturas de pantalla.
* **Descarga de Comparativa Enfrentada**: Genera y descarga una sola imagen combinada que contiene ambas imágenes cara a cara con sus respectivas marcas de diseño superpuestas.
* **Split Slider (Swipe) e Opacity Overlay**: Compara posiciones y transparencias interactivas en tiempo real.
* **Historial de Diffs Dinámico**: Guardado y restauración automática de comparaciones con sus correspondientes metadatos (threshold, color, discrepancias).

---

## 5. Comandos Útiles de Docker
* **Ver logs del servidor**: `docker logs -f vyu-workspace`
* **Detener el contenedor**: `docker stop vyu-workspace`
* **Iniciar un contenedor detenido**: `docker start vyu-workspace`
* **Eliminar el contenedor**: `docker rm -f vyu-workspace`
