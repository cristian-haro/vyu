# Guía de Usuario: Vyú (Workspace de Regresión Visual)

¡Bienvenido a la guía oficial de **Vyú**! Este documento te guiará paso a paso sobre cómo aprovechar al máximo tu nuevo workspace interactivo de diseño y pruebas de regresión visual.

---

## 1. Estructura de la Interfaz

La pantalla principal de **Vyú** está organizada en tres columnas principales para maximizar tu flujo de trabajo:

1. **Panel Izquierdo (Gestión y Carga)**:
   * **Carga Rápida (Quick Compare)**: Arrastra y suelta imágenes locales.
   * **Historial de Diffs**: Tu galería de pruebas guardadas en el servidor con restauración automática.
   * **Scripts de Comparación**: Lista de scripts `.js` listos para ser ejecutados en Node.js.
2. **Área Central (Visualizador Interactivo)**:
   * Pestañas para cambiar el modo de análisis visual (*Side-by-Side*, *Split Slider* y *Opacity Overlay*).
   * Controles de restauración de Zoom.
   * Ventana gráfica principal con soporte de inspección de coordenadas al pasar el cursor.
   * **Barra de Métricas Inferior**: Indicador del total de píxeles diferentes, porcentaje de desajuste y estado (`PASS` / `FAIL`).
3. **Panel Derecho (Parámetros y Terminal)**:
   * **Sensibilidad (Threshold)**: Deslizador para ajustar qué tan estricto es el motor a cambios leves de color.
   * **Ignorar Anti-Aliasing**: Filtro para evitar falsos positivos por suavizado de fuentes o bordes.
   * **Color de Marcado**: Paleta de colores neón para pintar las diferencias.
   * **Consola del Script**: Terminal interactiva retro-moderna con marcas de tiempo `[HH:MM:SS]` en tiempo real.

---

## 2. Los 3 Modos de Visualización

### Modo A: Side-by-Side (Lado a Lado)
> [!TIP]
> **Ideal para:** Inspeccionar detalles milimétricos en textos o botones.
* Muestra de forma paralela tres paneles: **BASE (V1)**, **CURRENT (V2)** y **DIFF (Diferencias)**.
* **Zoom & Pan Sincronizados**: Haz scroll con la rueda del mouse en cualquiera de las tres imágenes; el resto se ampliará y moverá exactamente a la misma posición en tiempo real. Arrastra con click sostenido para moverte por la imagen.
* **Pixel Inspector**: Al pasar el cursor por cualquier imagen, flotará un indicador mostrando las coordenadas exactas de píxel `X` e `Y`.

### Modo B: Split Slider (Swipe)
> [!TIP]
> **Ideal para:** Comprobar si hay desalineaciones de maquetación o cambios físicos de posición.
* Superpone la imagen *Current* sobre la *Base* de forma perfecta a nivel de píxel.
* Arrastra la barra vertical central de color índigo con el mouse a la izquierda o derecha. 
* El sistema utiliza una **máscara poligonal CSS** ultra-fluida para revelar qué componente se ha movido respecto al diseño original.

### Modo C: Opacity Overlay (Onion Skin)
> [!TIP]
> **Ideal para:** Comprobar sutiles variaciones en sombreados, transparencias o grosores de línea.
* Coloca ambas capturas una encima de la otra.
* Utiliza el deslizador inferior de opacidad para fundir una imagen sobre otra de 0% a 100%.

---

## 3. Flujo 1: Carga Rápida (Quick Compare)

Si tienes dos capturas de pantalla y quieres compararlas de forma inmediata sin scripts:

1. Dirígete a la sección **Carga Rápida** en el panel izquierdo.
2. Arrastra tu imagen de referencia y suéltala en el cuadro **Baseline (Base)** (o haz clic para buscar el archivo).
3. Arrastra la imagen con cambios en el cuadro **Current (Prueba)**.
4. El botón **"Ejecutar Comparación Rápida"** se activará. Haz clic en él.
5. Las imágenes se procesarán en el servidor y se renderizarán al instante en tu visualizador central, mostrando la barra de resultados.

---

## 4. Flujo 2: Automatización de Scripts Node.js

Para ejecutar scripts de prueba robustos que analicen flujos enteros:

1. Coloca tus archivos `.js` en la carpeta `scripts/` del proyecto.
2. Refresca la aplicación y aparecerán listados de forma automática en la sección **"Scripts de Comparación"**.
3. Haz clic en el botón **"Ejecutar"** del script deseado.
4. La **Consola del Script** se encenderá en tiempo real:
   * Mostrará un prompt simulado `$ node scripts/[nombre].js`.
   * Imprimirá el log detallado `stdout` y `stderr` del subproceso con timestamps precisos.
5. Al finalizar el script, si este genera una nueva imagen de diff, la interfaz la detectará y **actualizará tu visualizador y barra de métricas automáticamente** sin necesidad de refrescar el navegador.

---

## 5. Flujo 3: Integración Avanzada con Maestro

Si utilizas **Maestro** para hacer pruebas en emuladores móviles y quieres compararlo con maquetas de diseño:

### Paso 1: Configurar las Carpetas de Referencia
* Coloca los diseños ideales (Mockups de Figma / Diseños base aprobados en PNG) en la carpeta:
  `data/maestro/baseline/` (Ej. `pantalla_login.png`).

### Paso 2: Ejecutar tu Suite de Maestro
* Ejecuta tus pruebas móviles automatizadas de Maestro. Configura las capturas del flujo para que se guarden en:
  `data/maestro/current/` con el mismo nombre de archivo (Ej. `pantalla_login.png`).

### Paso 3: Lanzar la Comparación en Vyú
* Dirígete a la interfaz web de **Vyú**.
* Ubica en el menú izquierdo el script `compare-maestro-screens.js` y presiona **Ejecutar**.
* La terminal transmitirá en vivo el análisis secuencial de cada pantalla móvil y te indicará si hay regresiones de píxeles.
* El resultado se guardará en tu **Historial de Diffs**. Solo haz clic en la lista para inspeccionar la pantalla móvil del emulador y ver los desalineamientos interactuando con el **Split Slider**.

---

## 6. Historial de Diffs (Guardar y Restaurar)

Cada vez que realizas una comparación, Vyú genera un histórico persistente:
* Verás cada prueba ordenada cronológicamente en el sidebar izquierdo.
* Las tarjetas muestran la hora de ejecución, tipo de test y el porcentaje de regresión.
* **Restauración Inteligente**: Al hacer clic en una tarjeta del historial, la herramienta recargará la imagen diff, el baseline, el current, y restaurará el deslizador de `Threshold`, la casilla de `Anti-Aliasing` y el color del Diff exactamente a como se ejecutó originalmente.
* **Exportación**: Puedes presionar el botón `Descargar` en la cabecera del visualizador de diferencias para guardar el archivo final en tu computadora.
