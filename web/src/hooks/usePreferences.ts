import { useEffect, useState } from "react";
import type { Avatars } from "../types";
import { validAvatarUrl } from "../lib/identity";
function readAvatars(): Avatars {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("crabase.avatars") || "{}",
    );
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(
      Object.entries(saved).filter(
        ([, url]) => typeof url === "string" && validAvatarUrl(url),
      ),
    );
  } catch {
    return {};
  }
}
export function usePreferences() {
  const [name, setName] = useState<string>(() => {
    const query = new URLSearchParams(location.search).get("user");
    return (
      [query, sessionStorage.getItem("crabase.test-user")].find(
        (v) => v === "user1" || v === "user2",
      ) || "user1"
    );
  });
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("crabase.theme") === "dark" ? "dark" : "light",
  );
  const [avatars, setAvatars] = useState(readAvatars);
  useEffect(() => {
    sessionStorage.setItem("crabase.test-user", name);
    const url = new URL(location.href);
    if (url.searchParams.has("user")) {
      url.searchParams.delete("user");
      history.replaceState(null, "", url);
    }
  }, [name]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("crabase.theme", theme);
  }, [theme]);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === "crabase.avatars") setAvatars(readAvatars());
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  function changeAvatar(user: string, url: string) {
    const next = { ...avatars, [user]: url };
    setAvatars(next);
    localStorage.setItem("crabase.avatars", JSON.stringify(next));
  }
  return { name, setName, theme, setTheme, avatars, changeAvatar };
}
