export function clampSidebarWidth(width: number) {
  return Math.max(200, Math.min(500, width));
}

export function clampPanelWidth(width: number, min: number, max: number, viewport = window.innerWidth) {
  return Math.max(min, Math.min(max, viewport - 200, width));
}
