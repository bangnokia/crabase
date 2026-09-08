import { useCallback, useEffect, useState } from "react";
import { parseRoute } from "../lib/routes";
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(location.pathname));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = useCallback((path: string) => {
    if (location.pathname !== path) history.pushState(null, "", path);
    setRoute(parseRoute(path));
  }, []);
  return { route, navigate };
}
