export function fileSearchDirection(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing">) {
  if (event.isComposing) return 0;
  const control = event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  if (event.key === "ArrowDown" || (control && event.key.toLowerCase() === "n")) return 1;
  if (event.key === "ArrowUp" || (control && event.key.toLowerCase() === "p")) return -1;
  return 0;
}

export function isSidebarShortcut(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "metaKey"
    | "ctrlKey"
    | "altKey"
    | "shiftKey"
    | "repeat"
    | "isComposing"
  >,
) {
  return (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === "b" &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing
  );
}
