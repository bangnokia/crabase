import { useState } from "react";
import { Check, Moon, Search, Sun } from "lucide-react";
import type { Avatars, Chat } from "../types";
import { Avatar, AvatarStack } from "./Avatar";
import { avatarUrl, validAvatarUrl } from "../lib/identity";
import { Dialog, ErrorNotice } from "./ui";
export function SearchDialog({
  chats,
  avatars,
  open,
  close,
}: {
  chats: Chat[];
  avatars: Avatars;
  open: (id: string) => void;
  close: () => void;
}) {
  const [search, setSearch] = useState("");
  const results = chats.filter((chat) =>
    `${chat.title} ${chat.project_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Dialog title="Find a chat" close={close}>
      <div className="search-field">
        <Search size={18} />
        <input
          autoFocus
          aria-label="Search chats"
          placeholder="Search chats and projects…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="search-results">
        {results.map((chat) => (
          <button key={chat.id} onClick={() => open(chat.id)}>
            <AvatarStack users={chat.participants} avatars={avatars} />
            <span>
              <strong>{chat.title}</strong>
              <small>
                {chat.project_name || "Chat"}
                {chat.archived ? " · Archived" : ""}
              </small>
            </span>
          </button>
        ))}
        {!results.length && <p className="empty-state">No matching chats.</p>}
      </div>
    </Dialog>
  );
}
export function SettingsDialog({
  users,
  name,
  setName,
  theme,
  setTheme,
  avatars,
  changeAvatar,
  close,
}: {
  users: import("../types").User[];
  name: string;
  setName: (name: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  avatars: Avatars;
  changeAvatar: (user: string, url: string) => Promise<void>;
  close: () => void;
}) {
  const [url, setUrl] = useState(avatarUrl(name, avatars));
  const [error, setError] = useState("");
  return (
    <Dialog title="Settings" close={close}>
      <label>
        User for this tab
        <select
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setUrl(avatarUrl(event.target.value, avatars));
            setError("");
          }}
        >
          {users.map((user) => (
            <option key={user.id} value={user.name}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!validAvatarUrl(url)) {
            setError("Enter an HTTP or HTTPS image URL.");
            return;
          }
          void changeAvatar(name, url)
            .then(() => setError(""))
            .catch((error) => setError(error.message));
        }}
      >
        <label>
          Avatar image URL
          <div className="avatar-setting">
            <Avatar user={name} avatars={avatars} />
            <input
              aria-label="Avatar image URL"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button className="button secondary" type="submit">
              Save
            </button>
          </div>
        </label>
        <ErrorNotice message={error} />
      </form>
      <fieldset>
        <legend>Appearance</legend>
        <div className="theme-options">
          {["light", "dark"].map((value) => (
            <button
              key={value}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              {value === "light" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{value === "light" ? "Light" : "Dark"}</span>
              {theme === value && <Check size={16} />}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="dialog-description">
        These are test identities. Avatar preferences are shared across tabs in
        this browser.
      </p>
      <div className="dialog-actions">
        <button className="button primary" onClick={close}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
