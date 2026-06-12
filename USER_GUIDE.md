# Guía de Usuario: Vyú (Workspace de Regresión Visual)

¡Bienvenido a la guía oficial de **Vyú**! Este documento te guiará paso a paso sobre cómo aprovechar al máximo tu nuevo workspace interactivo de diseño y pruebas de regresión visual.

---

## 1. Estructura de la Interfaz

La pantalla principal de **Vyú** está organizada en dos columnas principales para maximizar tu flujo de trabajo:

1. **Panel Izquierdo (Gestión, Ajustes e Historial)**:
   * **Carga Rápida (Quick Compare)**: Arrastra y suelta imágenes locales PNG para compararlas de forma instantánea.
   * **Parámetros de Ajuste**: 
     * **Sensibilidad (Threshold)**: Controla la tolerancia del motor a cambios leves de color.
     * **Ignorar Anti-Aliasing**: Filtro para evitar falsos positivos en tipografías y bordes redondeados.
     * **Color de Marcado**: Escoge el tono neón de marcado para la imagen de diferencias.
   * **Historial de Diffs**: Tu galería de comparaciones guardadas en el servidor con restauración inteligente del estado de los visores y sus metadatos.
2. **Área Central (Visualizador Interactivo y Barra de Herramientas)**:
   * **Barra de Pestañas Superior**:
     * Selector de modos de visualización (*Side-by-Side*, *Split Slider* y *Opacity Overlay*).
     * **Acciones de Anotación (Deshacer, Borrar Todo, Descargar Comparativa)**: Agrupadas dinámicamente en el lateral derecho de la barra.
     * **Controles de Navegación**: Botón de restaurar Zoom y el porcentaje actual.
   * **Barra de Herramientas de Anotación**: Menú flotante dedicado a personalizar marcas (Mover/Pan, Lápiz, Rectángulo, Círculo, Nota de Texto y Borrador por clic), grosor y color.
   * **Visor Gráfico Principal**: Ventana donde interactúas con las imágenes.
   * **Barra de Métricas Inferior**: Indicador del total de píxeles diferentes, porcentaje de desajuste y estado (`PASS` / `FAIL`).

---

## 2. Los 3 Modos de Visualización

### Modo A: Side-by-Side (Lado a Lado)
> [!TIP]
> **Ideal para:** Inspeccionar detalles milimétricos en textos o botones y realizar marcas.
* Muestra de forma paralela tres paneles: **BASE (V1)**, **CURRENT (V2)** y **DIFF (Diferencias)**.
* **Zoom & Pan Sincronizados**: Haz scroll con la rueda del mouse en cualquiera de las tres imágenes; el resto se ampliará y moverá exactamente a la misma posición. Arrastra con click sostenido para moverte por la imagen.
* **Pixel Inspector**: Al pasar el cursor por cualquier imagen, flotará un indicador mostrando las coordenadas exactas de píxel `X` e `Y`.

### Modo B: Split Slider (Swipe)
> [!TIP]
> **Ideal para:** Comprobar desalineaciones de maquetación o cambios físicos de posición.
* Superpone la imagen *Current* sobre la *Base* de forma perfecta a nivel de píxel.
* Arrastra la barra vertical central con el mouse a la izquierda o derecha para revelar qué componentes se han movido.

### Modo C: Opacity Overlay (Onion Skin)
> [!TIP]
> **Ideal para:** Comprobar sutiles variaciones en sombreados o transparencias.
* Coloca ambas capturas una encima de la otra y utiliza el deslizador inferior de opacidad (de 0% a 100%).

---

## 3. Flujo 1: Carga Rápida (Quick Compare)

Si tienes dos capturas de pantalla y quieres compararlas de forma inmediata:

1. Dirígete a la sección **Carga Rápida** en el panel izquierdo.
2. Arrastra tu imagen de referencia y suéltala en el cuadro **Baseline (Base)** (o haz clic para seleccionar).
3. Arrastra la imagen con cambios en el cuadro **Current (Prueba)**.
4. Haz clic en **"Ejecutar Comparación Rápida"**.
5. Las imágenes se procesarán en el servidor. **Si las imágenes tienen tamaños diferentes, el servidor redimensionará automáticamente la versión de prueba (Current) para que coincida con la base (Baseline)** mediante interpolación bilineal suave y guardará la copia corregida para evitar fallos de visualización o discrepancias de tamaño.
6. El visualizador renderizará los resultados mostrando la diferencia de píxeles.

---

## 4. Flujo 2: Herramientas de Dibujo y Anotaciones

Una vez ejecutada la comparación en el modo **Side-by-Side**, puedes añadir marcas para reportar discrepancias específicas:

1. **Seleccionar Herramienta**:
   * **Lápiz**: Dibuja trazos libres a mano alzada.
   * **Rectángulo** y **Círculo**: Dibuja formas geométricas para encuadrar botones o textos erróneos.
   * **Nota (💬)**: Haz clic en cualquier parte de la imagen, escribe una nota de texto en el cuadro emergente y presiona Enter. La tipografía se escalará de forma inteligente según el grosor del pincel seleccionado para ser muy legible incluso al descargar capturas de alta resolución.
2. **Interactuar con el Lienzo**:
   * Cualquier marca dibujada sobre la Base, Current o Diff se replicará simétricamente en todos los visores a la vez.
   * Las anotaciones están en coordenadas naturales de imagen, por lo que permanecen perfectamente ancladas a sus píxeles correspondientes aunque hagas zoom o paneo.
   * **Desplazamiento rápido**: Puedes panear la imagen mientras dibujas **manteniendo presionada la barra espaciadora** (el cursor cambiará a una mano).
3. **Deshacer y Borrar**:
   * Haz clic en **Borrador (🧽)** en el menú de marcas y haz clic directamente sobre una línea, caja o nota del lienzo para eliminarla de forma selectiva.
   * Haz clic en **Deshacer** en la barra superior para remover la última marca hecha.
   * Haz clic en **Borrar todo** para limpiar el lienzo por completo.
4. **Descargar Comparativa**:
   * Presiona el botón **Descargar Comparativa** en la barra superior.
   * Generará en tu computadora una sola imagen PNG que junta el Baseline a la izquierda y el Current a la derecha con un encabezado premium y los trazos de anotación dibujados sobre ambos lados.

---

## 5. Flujo 3: Integración Avanzada con Maestro

Si utilizas **Maestro** para hacer pruebas en emuladores móviles y quieres compararlo con maquetas de diseño:

### Paso 1: Configurar las Carpetas de Referencia
* Coloca tus mockups o diseños base aprobados en PNG en la carpeta `data/maestro/baseline/` (Ej. `pantalla_login.png`).

### Paso 2: Ejecutar tus Pruebas de Maestro
* Configura tus flujos de prueba en Maestro para guardar las capturas generadas en la carpeta `data/maestro/current/` con el mismo nombre de archivo (Ej. `pantalla_login.png`).

### Paso 3: Lanzar la Comparación desde la Terminal
* Abre la terminal y ejecuta el script de comparación de Maestro:
   ```bash
   node scripts/compare-maestro-screens.js
   ```
* El script redimensionará de forma automática las capturas que difieran en tamaño, ejecutará la comparación de píxeles y generará los resultados en el **Historial de Diffs** en Vyú.
* Abre la web de Vyú y haz clic en la nueva tarjeta creada en el historial para inspeccionar e interactuar con la regresión del emulador.

---

## 6. Historial de Diffs (Guardar y Restaurar)

Cada comparación realizada (sea por carga rápida o vía script de Maestro) se almacena cronológicamente en el sidebar izquierdo:
* Haz clic sobre cualquier item del historial para restaurar por completo la comparativa.
* **Restauración de Configuración**: Vyú volverá a aplicar el baseline, current y diff correspondientes, y restaurará el deslizador de `Threshold`, el selector de `Anti-Aliasing` y el color del Diff exactamente a como se ejecutó originalmente.
