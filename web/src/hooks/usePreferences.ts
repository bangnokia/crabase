import { useEffect, useState } from "react";
import type { User } from "../types";
import { useAuth } from "../components/AuthGate";
export function usePreferences(users: User[]) {
  const { user } = useAuth();
  const name = user.name;
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("crabase.theme") === "dark" ? "dark" : "light",
  );
  const avatars = Object.fromEntries(
    users.map((user) => [user.name, user.avatar_url]),
  );
  useEffect(() => {
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
  return { name, theme, setTheme, avatars };
}
