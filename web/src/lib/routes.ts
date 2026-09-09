export type Route =
  | { page: "new" }
  | { page: "settings" }
  | { page: "chat"; id: string }
  | { page: "missing" };
export function parseRoute(path: string): Route {
  if (path === "/") return { page: "new" };
  if (path === "/settings" || path === "/settings/") return { page: "settings" };
  const match = /^\/chat\/([a-f0-9]{16})\/?$/.exec(path);
  return match ? { page: "chat", id: match[1] } : { page: "missing" };
}
export function chatPath(id: string) {
  return `/chat/${encodeURIComponent(id)}`;
}
