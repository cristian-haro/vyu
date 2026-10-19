# Vyú - Visual Regression Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-24292e.svg)](https://pages.github.com/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

[English Version](#english-version) | [Versión en Español](#versión-en-español)

---

<a name="english-version"></a>
## English Version

**Vyú** is a high-performance visual regression workspace and pixel-by-pixel differential inspection tool. Designed for frontend engineers, UI/UX designers, and QA automation teams, Vyú offers client-side differential computation via Pixelmatch, synchronized multi-viewport zoom & pan, custom exclusion masks (Ignore Zones), automatic error clustering (BFS bounding boxes), design annotation tools, and confronted export capabilities.

---

### Key Features

| Feature | Description |
| :--- | :--- |
| **Triple Synchronized Viewport** | Simultaneous inspection across **Base (V1)**, **Current (V2)**, and **Diff** with pixel-perfect lockstep zoom & pan. |
| **Interactive Split Slider** | Swipe mode with high-precision drag handle to identify layout displacement and component shifts. |
| **Opacity Overlay (Onion Skin)** | Variable alpha layer blending (0% to 100%) to spot subtle shadow and gradient shifts. |
| **Client-Side Differential Engine** | Fast, privacy-preserving in-browser computation with custom sensitivity threshold, anti-aliasing filter, and neon highlight palettes. |
| **Exclusion Masks (Ignore Zones)** | Draw rectangular ignore regions to omit dynamic widgets (timestamps, animated carousels, ads) from the diff calculation. |
| **Automatic Error Clustering** | Connected-component clustering (BFS) automatically isolates and quantifies regression areas into selectable bounding boxes. |
| **Annotation & QA Markup Suite** | Vector pencil, rectangles, circles, text notes with adaptive scale, click-to-delete eraser, and select-and-drag manipulation. |
| **Confronted Comparison Export** | One-click generation of a unified side-by-side PNG report embedding all annotations and metadata headers. |
| **Zero-Cloud Local Persistence** | Fully offline IndexedDB storage (`VyuLocalDB`) with complete state restoration (images, parameters, and metadata). |

---

### Architecture & Processing Pipeline

```mermaid
flowchart TD
    subgraph Input["1. Input Ingestion"]
        A[Baseline Image] --> C[HTML5 Canvas Processor]
        B[Current Image] --> C
        D[Ignore Masks] --> C
    end

    subgraph Core["2. Engine & Diff Pipeline"]
        C --> E[Bilinear Normalization & Resizing]
        E --> F[Pixelmatch Differential Core]
        F --> G[Diff Image Buffer]
        G --> H[BFS Error Clustering Engine]
    end

    subgraph Visualizer["3. Interactive Viewport & Tools"]
        G --> I[Synchronized Canvas Viewport]
        H --> J[Auto-Discrepancy Inspector]
        I --> K[Annotation & Markup Layer]
        K --> L[Confronted PNG Export]
    end

    subgraph Storage["4. Persistence"]
        G --> M[(IndexedDB: VyuLocalDB)]
    end
```

---

##  Quick Start

### 1. Local Execution (Node.js)

#### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v8.0.0 or higher

```bash
# Clone the repository
git clone https://github.com/cristian-haro/vyu.git
cd vyu

# Install dependencies
npm install

# Start the static local server
npm start
```

Open your browser at **`http://localhost:3000`**.

---

### 2. Docker Execution

Vyú is containerized with lightweight Alpine Linux:

```bash
# Build the Docker image
docker build -t vyu .

# Run the container
docker run -d -p 3000:3000 --name vyu-workspace vyu

# Check logs
docker logs -f vyu-workspace
```

---

## ⌨ Shortcuts & Hotkeys

| Key / Shortcut | Action |
| :--- | :--- |
| `Space` *(Hold)* | Quick Pan mode (switches cursor to grab without losing active drawing tool) |
| `Ctrl + Z` / `Cmd + Z` | Undo last drawn annotation |
| `Delete` / `Backspace` | Remove selected annotation shape |
| `Mouse Wheel` | Synchronized zoom centered at cursor |
| `Mouse Drag` | Synchronized viewport panning (in Pan mode or with Space pressed) |

---

##  Cross-Platform Compatibility Matrix

| Platform / Browser | Engine | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Google Chrome / Chromium** (Win/macOS/Linux) | Blink |  Verified | Hardware-accelerated canvas rendering |
| **Mozilla Firefox** (Win/macOS/Linux) | Gecko |  Verified | Full IndexedDB & Blob lifecycle support |
| **Apple Safari** (macOS/iOS) | WebKit |  Verified | HiDPI / Retina canvas density handled |
| **Microsoft Edge** (Windows) | Blink |  Verified | Native performance |
| **Mobile Browsers** (Chrome/Safari) | Blink/WebKit |  Verified | Responsive layout & touch-action enabled |

---

##  Contribution & Conventional Commits

We enforce the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. All commit messages must follow this structure:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Commit Types:
* `feat`: A new feature or capability.
* `fix`: A bug fix.
* `docs`: Documentation updates.
* `style`: Code style / formatting changes (no logic changes).
* `refactor`: Code refactoring without behavioral changes.
* `perf`: Performance optimization.
* `test`: Adding or correcting tests.
* `chore`: Build tasks, package updates, maintenance.

---

### License

This project is licensed under the [MIT License](LICENSE).


---

<a name="versión-en-español"></a>
## Versión en Español

**Vyú** es un espacio de trabajo interactivo de alto rendimiento para inspección visual y análisis de regresiones píxel a píxel. Diseñado para ingenieros frontend, diseñadores UI/UX y equipos de control de calidad (QA), Vyú ofrece cálculo diferencial en el navegador mediante Pixelmatch, visualizadores sincronizados con zoom y paneo milimétrico, máscaras de exclusión (Zonas Ignoradas), detección automática de discrepancias con algoritmo de clustering BFS, herramientas completas de anotación y exportación de comparativas enfrentadas.

---

### Características Principales

| Característica | Descripción |
| :--- | :--- |
| **Visualizador Triple Sincronizado** | Inspección en paralelo de **Base (V1)**, **Current (V2)** y **Diff** con zoom y paneo sincronizados al píxel. |
| **Split Slider (Swipe Interactivo)** | Modo cortina con deslizador central de alta precisión para detectar desalineaciones y desplazamientos de maquetación. |
| **Opacity Overlay (Onion Skin)** | Superposición con transparencia variable (0% a 100%) para detectar variaciones sutiles de sombreado y gradientes. |
| **Motor Diferencial en Cliente** | Procesamiento seguro y privado en navegador con umbral de sensibilidad configurable, filtro anti-aliasing y paletas neón. |
| **Máscaras de Exclusión (Zonas Ignoradas)** | Dibuja zonas rectangulares para omitir elementos dinámicos (fechas, carruseles, banners de anuncios) del cálculo de diff. |
| **Clustering Automático de Errores** | Algoritmo BFS que aísla y cuantifica automáticamente cada área de regresión en cajas delimitadoras interactivas. |
| **Suite de Anotación y QA** | Lápiz vectorial, rectángulos, círculos, notas de texto con auto-escalado, borrador por clic y selección/arrastre de marcas. |
| **Descarga de Comparativa Enfrentada** | Exportación con un clic de un reporte PNG consolidado lado a lado con todas las anotaciones y metadatos superpuestos. |
| **Persistencia 100% Local (IndexedDB)** | Almacenamiento seguro en `VyuLocalDB` sin subidas a la nube, con restauración completa de imágenes, marcas y parámetros. |

---

### Arquitectura y Flujo de Procesamiento

```mermaid
flowchart TD
    subgraph Entrada["1. Ingesta de Imágenes"]
        A[Imagen Base / Baseline] --> C[Procesador Canvas HTML5]
        B[Imagen Prueba / Current] --> C
        D[Máscaras de Ignorado] --> C
    end

    subgraph Nucleo["2. Motor Diferencial"]
        C --> E[Normalización y Redimensionado Bilineal]
        E --> F[Motor Diferencial Pixelmatch]
        F --> G[Buffer de Imagen Diff]
        G --> H[Algoritmo de Clustering BFS]
    end

    subgraph Visualizador["3. Espacio Visual y Herramientas"]
        G --> I[Visor Sincronizado Multi-Canvas]
        H --> J[Inspector de Discrepancias / Cajas]
        I --> K[Capa de Anotación Vectorial]
        K --> L[Exportación PNG Enfrentada]
    end

    subgraph Almacenamiento["4. Persistencia"]
        G --> M[(IndexedDB: VyuLocalDB)]
    end
```

---

##  Guía de Inicio Rápido

### 1. Ejecución Local con Node.js

#### Prerrequisitos
* **Node.js**: v18.0.0 o superior
* **npm**: v8.0.0 o superior

```bash
# Clonar el repositorio
git clone https://github.com/cristian-haro/vyu.git
cd vyu

# Instalar dependencias
npm install

# Iniciar el servidor local
npm start
```

Abre tu navegador e ingresa a **`http://localhost:3000`**.

---

### 2. Ejecución con Docker

Vyú incluye empaquetado optimizado en contenedor Alpine Linux:

```bash
# Construir la imagen Docker
docker build -t vyu .

# Iniciar el contenedor en segundo plano
docker run -d -p 3000:3000 --name vyu-workspace vyu

# Ver los logs del contenedor
docker logs -f vyu-workspace
```

---

## ⌨ Atajos de Teclado y Gestos

| Atajo / Tecla | Acción |
| :--- | :--- |
| `Barra Espaciadora` *(Mantener)* | Modo Paneo Rápido (cambia temporalmente el cursor a mano sin perder la herramienta de dibujo activa) |
| `Ctrl + Z` / `Cmd + Z` | Deshacer la última anotación realizada |
| `Supr` / `Delete` / `Backspace` | Eliminar la forma o nota seleccionada |
| `Rueda del Mouse` | Zoom sincronizado centrado en la posición del cursor |
| `Arrastre de Mouse` | Paneo sincronizado en el visor (en modo Mover o con Espacio presionado) |

---

##  Matriz de Compatibilidad Multiplataforma

| Plataforma / Navegador | Motor | Estado | Notas |
| :--- | :--- | :--- | :--- |
| **Google Chrome / Chromium** (Win/macOS/Linux) | Blink |  Verificado | Aceleración por hardware en canvas 2D |
| **Mozilla Firefox** (Win/macOS/Linux) | Gecko |  Verificado | Soporte completo para IndexedDB y Blob URLs |
| **Apple Safari** (macOS/iOS) | WebKit |  Verificado | Manejo correcto de densidad de píxeles Retina / HiDPI |
| **Microsoft Edge** (Windows) | Blink |  Verificado | Rendimiento nativo óptimo |
| **Navegadores Móviles** (Chrome/Safari) | Blink/WebKit |  Verificado | Interfaz responsiva con soporte táctil |

---

##  Contribución y Commits Convencionales

Seguimos la especificación de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/). Cada commit debe seguir la estructura:

```text
<tipo>(<alcance>): <descripción corta>

[cuerpo opcional]

[pie opcional]
```

### Tipos de Commit Permitidos:
* `feat`: Nueva característica o funcionalidad.
* `fix`: Corrección de errores.
* `docs`: Cambios en la documentación.
* `style`: Ajustes visuales de código/estilos sin cambio lógico.
* `refactor`: Refactorización de código sin alterar comportamiento.
* `perf`: Mejoras de rendimiento.
* `test`: Adición o corrección de pruebas.
* `chore`: Tareas de build, dependencias o mantenimiento.

---

### Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).

