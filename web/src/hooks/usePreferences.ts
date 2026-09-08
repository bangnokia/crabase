import { useEffect, useState } from "react";
import type { User, Request } from "../types";
export function usePreferences(users: User[], request: Request) {
  const [name, setName] = useState<string>(() => {
    const query = new URLSearchParams(location.search).get("user");
    return (
      [query, sessionStorage.getItem("crabase.test-user")].find(
        (v) => typeof v === "string" && v.length > 0,
      ) || "user1"
    );
  });
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("crabase.theme") === "dark" ? "dark" : "light",
  );
  const avatars = Object.fromEntries(
    users.map((user) => [user.name, user.avatar_url]),
  );
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
  async function changeAvatar(userName: string, url: string) {
    const user = users.find((user) => user.name === userName);
    if (!user) throw new Error("User not found.");
    await request("userAvatar", { user_id: user.id, avatar_url: url });
  }
  return { name, setName, theme, setTheme, avatars, changeAvatar };
}
