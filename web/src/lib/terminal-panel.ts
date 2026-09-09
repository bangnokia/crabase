type PanelState = { open: boolean; count: number };

export function terminalPanelAction(previous: PanelState, next: PanelState) {
  if (!next.open) return null;
  if (!previous.open && next.count === 0) return "create";
  if (previous.open && previous.count > 0 && next.count === 0) return "hide";
  return null;
}
