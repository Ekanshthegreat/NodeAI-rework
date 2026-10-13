export function pxToMeters(px: number, mPerPx: number): number {
  return px * mPerPx;
}

export function worldFromImage(
  px: { x: number; y: number },
  origin: { x: number; y: number } = { x: 0, y: 0 },
  mPerPx: number
): { x: number; y: number } {
  return {
    x: origin.x + pxToMeters(px.x, mPerPx),
    y: origin.y + pxToMeters(px.y, mPerPx),
  };
}

export function metersToImage(
  world: { x: number; y: number },
  origin: { x: number; y: number } = { x: 0, y: 0 },
  mPerPx: number
): { x: number; y: number } {
  return {
    x: (world.x - origin.x) / mPerPx,
    y: (world.y - origin.y) / mPerPx,
  };
}
