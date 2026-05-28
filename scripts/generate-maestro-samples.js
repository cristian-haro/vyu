const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const MAESTRO_DIR = path.join(__dirname, '..', 'data', 'maestro');
const BASELINE_DIR = path.join(MAESTRO_DIR, 'baseline');
const CURRENT_DIR = path.join(MAESTRO_DIR, 'current');

[BASELINE_DIR, CURRENT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const WIDTH = 360;   // Mobile Width
const HEIGHT = 740;  // Mobile Height

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function drawRect(png, x, y, w, h, r, g, b) {
  for (let currY = y; currY < y + h; currY++) {
    for (let currX = x; currX < x + w; currX++) {
      setPixel(png, currX, currY, r, g, b);
    }
  }
}

function drawCircle(png, cx, cy, radius, r, g, b) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        setPixel(png, x, y, r, g, b);
      }
    }
  }
}

function drawMobileBase(png) {
  // 1. Fondo del teléfono (Blanco)
  drawRect(png, 0, 0, WIDTH, HEIGHT, 248, 250, 252);
  
  // 2. Barra de estado superior (Gris claro)
  drawRect(png, 0, 0, WIDTH, 30, 226, 232, 240);
  // Reloj simulado
  drawRect(png, 20, 10, 30, 10, 71, 85, 105);
  // Icono de batería
  drawRect(png, 310, 8, 25, 12, 71, 85, 105);
  
  // 3. Logo de App (Círculo Azul)
  drawCircle(png, 180, 150, 40, 99, 102, 241); // Indigo
  
  // 4. Campos de texto (Input Boxes)
  // Input Usuario
  drawRect(png, 40, 250, 280, 45, 255, 255, 255);
  // Borde input
  for(let x=40; x<320; x++) { setPixel(png, x, 250, 203, 213, 225); setPixel(png, x, 294, 203, 213, 225); }
  for(let y=250; y<295; y++) { setPixel(png, 40, y, 203, 213, 225); setPixel(png, 320, y, 203, 213, 225); }
  
  // Input Contraseña
  drawRect(png, 40, 320, 280, 45, 255, 255, 255);
  // Borde input
  for(let x=40; x<320; x++) { setPixel(png, x, 320, 203, 213, 225); setPixel(png, x, 364, 203, 213, 225); }
  for(let y=320; y<365; y++) { setPixel(png, 40, y, 203, 213, 225); setPixel(png, 320, y, 203, 213, 225); }
}

function generateBaseline() {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  drawMobileBase(png);
  
  // 5. Botón de Login (Verde esmeralda centrado)
  drawRect(png, 40, 400, 280, 50, 16, 185, 129);
  
  // Guardar baseline
  fs.writeFileSync(path.join(BASELINE_DIR, 'pantalla_login.png'), PNG.sync.write(png));
  console.log('[OK] Muestra de Maestro: baseline/pantalla_login.png generado.');
}

function generateCurrent() {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  drawMobileBase(png);
  
  // 5. REGRESIÓN DE MAESTRO: El botón está desalineado (10px a la derecha y 5px más abajo)
  // y cambió de color a un verde oliva por fallo de estilos CSS/Flutter
  drawRect(png, 50, 405, 280, 50, 132, 204, 22);
  
  // Guardar current
  fs.writeFileSync(path.join(CURRENT_DIR, 'pantalla_login.png'), PNG.sync.write(png));
  console.log('[OK] Muestra de Maestro: current/pantalla_login.png generado.');
}

generateBaseline();
generateCurrent();
