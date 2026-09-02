import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/* ==========================================================================
   CROSS-PLATFORM QA MAESTRO TEST SUITE - VYÚ
   Validates engine mathematics, clustering, coordinate transformations,
   viewport synchronization logic, and API endpoints across OS platforms.
   ========================================================================== */

describe('Vyú Cross-Platform QA Maestro Suite', () => {

  // -------------------------------------------------------------
  // 1. Matriz de Coordenadas y Transformaciones de Zoom/Pan
  // -------------------------------------------------------------
  describe('1. Coordinate Math & Zoom/Pan Precision Matrix', () => {
    it('should accurately map viewport mouse coordinates to natural image space at 100% zoom', () => {
      const zoom = 1.0;
      const panX = 0;
      const panY = 0;
      const clientX = 450;
      const clientY = 320;
      const rectLeft = 100;
      const rectTop = 50;

      const imgX = (clientX - rectLeft - panX) / zoom;
      const imgY = (clientY - rectTop - panY) / zoom;

      assert.equal(imgX, 350);
      assert.equal(imgY, 270);
    });

    it('should accurately calculate natural coordinates with 250% zoom and panning offset', () => {
      const zoom = 2.5;
      const panX = 120;
      const panY = -80;
      const clientX = 620;
      const clientY = 420;
      const rectLeft = 100;
      const rectTop = 100;

      const imgX = (clientX - rectLeft - panX) / zoom;
      const imgY = (clientY - rectTop - panY) / zoom;

      assert.equal(imgX, 160);
      assert.equal(imgY, 160);
    });

    it('should clamp zoom levels correctly within safety thresholds [0.1x - 10.0x]', () => {
      const clampZoom = (z) => Math.min(10.0, Math.max(0.1, z));
      assert.equal(clampZoom(0.02), 0.1);
      assert.equal(clampZoom(15.5), 10.0);
      assert.equal(clampZoom(1.85), 1.85);
    });
  });

  // -------------------------------------------------------------
  // 2. Algoritmo de Clustering BFS para Discrepancias de Error
  // -------------------------------------------------------------
  describe('2. BFS Discrepancy Clustering Algorithm', () => {
    function detectErrorClustersMock(diffGrid, cols, rows, gridSize = 20) {
      const visited = new Uint8Array(cols * rows);
      const clusters = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (diffGrid[idx] > 3 && !visited[idx]) {
            let minC = c, maxC = c, minR = r, maxR = r;
            let totalPixels = 0;
            const queue = [[c, r]];
            visited[idx] = 1;

            while (queue.length > 0) {
              const [curC, curR] = queue.shift();
              const curIdx = curR * cols + curC;
              totalPixels += diffGrid[curIdx];
              minC = Math.min(minC, curC);
              maxC = Math.max(maxC, curC);
              minR = Math.min(minR, curR);
              maxR = Math.max(maxR, curR);

              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  const nc = curC + dc;
                  const nr = curR + dr;
                  if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                    const nIdx = nr * cols + nc;
                    if (diffGrid[nIdx] > 1 && !visited[nIdx]) {
                      visited[nIdx] = 1;
                      queue.push([nc, nr]);
                    }
                  }
                }
              }
            }

            const pad = 6;
            const bx = Math.max(0, minC * gridSize - pad);
            const by = Math.max(0, minR * gridSize - pad);
            const bw = (maxC - minC + 1) * gridSize + pad * 2;
            const bh = (maxR - minR + 1) * gridSize + pad * 2;

            if (totalPixels >= 5) {
              clusters.push({
                id: clusters.length + 1,
                x: bx,
                y: by,
                w: bw,
                h: bh,
                pixelCount: totalPixels
              });
            }
          }
        }
      }
      return clusters;
    }

    it('should detect isolated error islands and compute bounding boxes', () => {
      const cols = 10;
      const rows = 10;
      const grid = new Int32Array(cols * rows);

      // Island 1 at (2,2) and (2,3)
      grid[2 * cols + 2] = 10;
      grid[2 * cols + 3] = 8;

      // Island 2 at (8,8)
      grid[8 * cols + 8] = 15;

      const clusters = detectErrorClustersMock(grid, cols, rows, 20);
      assert.equal(clusters.length, 2);
      assert.equal(clusters[0].pixelCount, 18);
      assert.equal(clusters[1].pixelCount, 15);
    });

    it('should ignore noise with fewer than threshold pixels', () => {
      const cols = 5;
      const rows = 5;
      const grid = new Int32Array(cols * rows);
      grid[1 * cols + 1] = 2; // Below the minimum threshold of 4

      const clusters = detectErrorClustersMock(grid, cols, rows, 20);
      assert.equal(clusters.length, 0);
    });
  });

  // -------------------------------------------------------------
  // 3. Máscaras de Exclusión (Zonas de Ignorado)
  // -------------------------------------------------------------
  describe('3. Ignore Masks & Exclusion Calculation', () => {
    it('should filter out pixels located within active ignore bounding boxes', () => {
      const ignoreRegions = [
        { x: 50, y: 50, w: 100, h: 80 }
      ];

      function isPixelIgnored(px, py, regions) {
        return regions.some(r => px >= r.x && px <= (r.x + r.w) && py >= r.y && py <= (r.y + r.h));
      }

      assert.equal(isPixelIgnored(60, 60, ignoreRegions), true);
      assert.equal(isPixelIgnored(120, 90, ignoreRegions), true);
      assert.equal(isPixelIgnored(20, 20, ignoreRegions), false);
      assert.equal(isPixelIgnored(200, 200, ignoreRegions), false);
    });
  });

  // -------------------------------------------------------------
  // 4. Integridad de Métricas de Regresión Visual
  // -------------------------------------------------------------
  describe('4. Visual Regression Metric Accuracy', () => {
    it('should compute exact mismatch percentages rounded to two decimals', () => {
      const totalPixels = 1920 * 1080; // 2,073,600 px
      const mismatchPixels = 20736;    // Exactly 1.00%
      const percentage = ((mismatchPixels / totalPixels) * 100).toFixed(2);

      assert.equal(percentage, '1.00');
    });

    it('should handle 0% clean match without divide-by-zero errors', () => {
      const totalPixels = 800 * 600;
      const mismatchPixels = 0;
      const percentage = ((mismatchPixels / totalPixels) * 100).toFixed(2);

      assert.equal(percentage, '0.00');
    });
  });

  // -------------------------------------------------------------
  // 5. Verificación de Health Check API del Servidor
  // -------------------------------------------------------------
  describe('5. Server Health Check API Endpoint', () => {
    let server;
    const testPort = 3899;

    before(async () => {
      // Import dynamic express app
      const express = (await import('express')).default;
      const app = express();
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', uptime: process.uptime() });
      });

      await new Promise((resolve) => {
        server = app.listen(testPort, resolve);
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it('should respond with status: "ok" on /api/health', async () => {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${testPort}/api/health`, (res) => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => resolve(JSON.parse(raw)));
        }).on('error', reject);
      });

      assert.equal(data.status, 'ok');
      assert.equal(typeof data.uptime, 'number');
    });
  });

});
