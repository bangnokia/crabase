import { useState } from "react";
import { Search } from "lucide-react";
import type { Avatars, Chat } from "../types";
import { AvatarStack } from "./Avatar";
import { Dialog } from "./ui";

export function SearchDialog({ chats, avatars, open, close }: {
  chats: Chat[]; avatars: Avatars; open: (id: string) => void; close: () => void;
}) {
  const [search, setSearch] = useState("");
  const results = chats.filter(chat => `${chat.title} ${chat.project_name || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <Dialog title="Find a chat" close={close}>
    <div className="search-field"><Search size={18} /><input autoFocus aria-label="Search chats"
      placeholder="Search chats and projects…" value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="search-results">
      {results.map(chat => <button key={chat.id} onClick={() => open(chat.id)}>
        <AvatarStack users={chat.participants} avatars={avatars} />
        <span><strong>{chat.title}</strong><small>{chat.project_name || "Chat"}{chat.archived ? " · Archived" : ""}</small></span>
      </button>)}
      {!results.length && <p className="empty-state">No matching chats.</p>}
    </div>
  </Dialog>;
}
