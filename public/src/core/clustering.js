// BFS Discrepancy clustering algorithm for visual regressions
export function findDiscrepancyClusters(diffData, width, height, minPixels = 10) {
  const visited = new Uint8Array(width * height);
  const clusters = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x);
      if (diffData[idx * 4 + 3] > 0 && !visited[idx]) {
        // Discrepancy pixel detected: start BFS expansion
        let minX = x, maxX = x, minY = y, maxY = y;
        let pixelCount = 0;
        const queue = [x, y];
        visited[idx] = 1;

        let qHead = 0;
        while (qHead < queue.length) {
          const currX = queue[qHead++];
          const currY = queue[qHead++];
          pixelCount++;

          if (currX < minX) minX = currX;
          if (currX > maxX) maxX = currX;
          if (currY < minY) minY = currY;
          if (currY > maxY) maxY = currY;

          // Check 4-connected neighbors
          const neighbors = [
            [currX + 1, currY],
            [currX - 1, currY],
            [currX, currY + 1],
            [currX, currY - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (diffData[nIdx * 4 + 3] > 0 && !visited[nIdx]) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        if (pixelCount >= minPixels) {
          clusters.push({
            x: minX,
            y: minY,
            width: (maxX - minX) + 1,
            height: (maxY - minY) + 1,
            pixelCount
          });
        }
      }
    }
  }

  return clusters;
}
