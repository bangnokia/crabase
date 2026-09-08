export function time(value: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60000),
  );
  return mins < 1
    ? "Just now"
    : mins < 60
      ? `${mins}m`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h`
        : new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
}
