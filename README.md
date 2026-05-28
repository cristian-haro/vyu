# Vyú - Workspace de Regresión Visual

¡Bienvenido a **Vyú**! Un espacio de trabajo interactivo premium diseñado para realizar pruebas de regresión visual píxel a píxel, ejecutar scripts automatizados de Node.js en tiempo real y analizar discrepancias de diseño con herramientas visuales avanzadas.

Este laboratorio visual está completamente listo para ser **dockerizado**, lo que te permite compartirlo con tu equipo y compañeros para que puedan levantarlo en cualquier máquina sin necesidad de configurar Node.js ni instalar dependencias manualmente.

---

## Inicio Rápido con Docker (Recomendado)

Para empaquetar y ejecutar la aplicación en un contenedor aislado, sigue estos pasos:

### 1. Construir la Imagen Docker
Abre una terminal en la raíz del proyecto y ejecuta el siguiente comando:
```bash
docker build -t vyu .
```
> **Nota**: Durante la construcción de la imagen, el sistema ejecutará automáticamente el generador de muestras sintéticas (`generate-samples.js`) para que el contenedor venga pre-cargado con capturas de prueba desde el primer segundo.

### 2. Levantar el Contenedor
Una vez construida la imagen, puedes ejecutarla en el puerto `3000` de tu máquina local:
```bash
docker run -d -p 3000:3000 --name vyu-workspace vyu
```

### 3. ¡Listo para Usar!
Abre tu navegador e ingresa a:
**[http://localhost:3000](http://localhost:3000)**

---

## Persistencia de Datos (Opcional)

Si deseas persistir las imágenes comparadas (`comparisons`) y subidas de tu equipo fuera del ciclo de vida del contenedor Docker (para que no se borren al apagarlo), puedes montar un volumen local vinculando la carpeta `data` de tu máquina al contenedor:

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/usr/src/app/data \
  --name vyu-workspace vyu
```

---

## Características Principales del Workspace
* **Visualizador Side-by-Side Sincronizado**: Zoom y paneo sincronizados en las 3 columnas (Base, Current, Diff) con visualización de coordenadas en hover.
* **Split Slider (Swipe)**: Línea de corte interactiva al píxel utilizando máscaras CSS `clip-path` ultrarrápidas.
* **Opacity Overlay**: Fundido de transparencias ajustable para superponer layouts.
* **Historial de Diffs Dinámico**: Guardado y restauración instantánea de comparaciones históricas con sus correspondientes metadatos (threshold, color, discrepancias).
* **Consola de Scripts en Vivo**: Ejecución asíncrona de scripts locales `.js` a través del navegador con logs SSE (Server-Sent Events) en tiempo real y timestamps.

---

## Comandos Útiles de Docker
* **Ver logs del servidor**:
  ```bash
  docker logs -f vyu-workspace
  ```
* **Detener el contenedor**:
  ```bash
  docker stop vyu-workspace
  ```
* **Iniciar un contenedor detenido**:
  ```bash
  docker start vyu-workspace
  ```
* **Eliminar el contenedor**:
  ```bash
  docker rm -f vyu-workspace
  ```
