// Coordinate transformation and zoom/pan math for canvas viewports
export function screenToNatural(screenX, screenY, zoom, panX, panY) {
  return {
    x: Math.round((screenX - panX) / zoom),
    y: Math.round((screenY - panY) / zoom)
  };
}

export function naturalToScreen(natX, natY, zoom, panX, panY) {
  return {
    x: (natX * zoom) + panX,
    y: (natY * zoom) + panY
  };
}

export function clampZoom(zoom, min = 0.1, max = 10.0) {
  return Math.min(Math.max(zoom, min), max);
}
