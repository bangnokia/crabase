export function matchScore(text: string, query: string) {
  const contiguous = text.indexOf(query);
  if (contiguous >= 0) return contiguous;
  let position = -1;
  let gaps = 0;
  for (const character of query) {
    const next = text.indexOf(character, position + 1);
    if (next < 0) return Infinity;
    gaps += next - position - 1;
    position = next;
  }
  return 100 + gaps;
}

export function searchFiles(paths: readonly string[], value: string) {
  const query = value.trim().toLowerCase().replaceAll("\\", "/");
  return paths.filter(path => !path.endsWith("/"))
    .map(path => {
      const lower = path.toLowerCase();
      const name = lower.slice(lower.lastIndexOf("/") + 1);
      return { path, score: query ? Math.min(matchScore(name, query), 1000 + matchScore(lower, query)) : 0 };
    })
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path))
    .slice(0, 50)
    .map(item => item.path);
}
