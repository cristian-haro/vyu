const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Checkear salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Vyú (Servidor de Archivos Estáticos)`);
  console.log(`Iniciado en http://localhost:${PORT}`);
  console.log(`==================================================`);
});
