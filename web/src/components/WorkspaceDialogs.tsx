import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Avatars, Chat, Project } from "../types";
import { AvatarStack } from "./Avatar";
import { Dialog, IconButton } from "./ui";
import type { Command } from "../lib/commands";

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "ig"));
  return <>{parts.map((part, index) => part.toLowerCase() === query.toLowerCase()
    ? <mark key={index}>{part}</mark>
    : part)}</>;
}

export function SearchDialog({ chats, projects, avatars, commands = [], open, close }: {
  chats: Chat[]; projects: Project[]; avatars: Avatars; commands?: Command[]; open: (id: string) => void; close: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => !project.archived).map((project, index) => {
        const title = project.name.toLowerCase();
        const matches = !query || title.includes(query);
        if (!matches) return null;
        const score = !query ? 0
          : title === query ? 0
            : title.startsWith(query) ? 1
              : 2;
        const chat = chats.find((item) => item.project_id === project.id && !item.archived);
        return chat ? { chat, index, score } : null;
      })
      .filter((result): result is { chat: Chat; index: number; score: number } => result !== null)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map(({ chat }) => chat);
  }, [chats, projects, search, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    const selected = results[selectedIndex];
    if (!selected) return;
    document.getElementById(`search-result-${selected.id}`)?.scrollIntoView({ block: "nearest" });
  }, [results, selectedIndex]);

  const query = search.trim();
  const selectResult = (index: number) => {
    const chat = results[index];
    if (chat) open(chat.id);
  };

  return <Dialog title="Search chats and projects" close={close} className="search-dialog" minimal>
    <div className="search-dialog-field">
      <Search size={18} aria-hidden="true" />
      <input
        ref={inputRef}
        autoFocus
        role="combobox"
        aria-label="Search chats and projects"
        aria-controls="search-result-list"
        aria-expanded="true"
        aria-activedescendant={results[selectedIndex] ? `search-result-${results[selectedIndex].id}` : undefined}
        placeholder="Search chats and projects…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((index) => results.length ? (index + 1) % results.length : 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
          } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
            event.preventDefault();
            setSelectedIndex((index) => results.length ? (index + 1) % results.length : 0);
          } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
            event.preventDefault();
            setSelectedIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
          } else if (event.key === "Home" && results.length) {
            event.preventDefault();
            setSelectedIndex(0);
          } else if (event.key === "End" && results.length) {
            event.preventDefault();
            setSelectedIndex(results.length - 1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            selectResult(selectedIndex);
          } else if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      />
      {search ? <IconButton className="search-clear" label="Clear search" onClick={() => { setSearch(""); inputRef.current?.focus(); }}><X size={16} /></IconButton> : <kbd>Esc</kbd>}
    </div>
    <div className="search-dialog-summary" aria-live="polite">
      {results.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : query ? "No matches" : "Recent chats"}
      {results.length > 0 && <span><kbd>↑</kbd><kbd>↓</kbd> to move <kbd>Enter</kbd> to open</span>}
    </div>
    <div id="search-result-list" className="search-results" role="listbox" aria-label="Search results">
      {commands.filter((command) => !query || [command.label, ...(command.keywords || [])].join(" ").toLowerCase().includes(query)).map((command) => <button key={command.id} role="option" onClick={() => { command.run(); close(); }}>
        <span className="search-result-copy"><strong>{command.label}</strong><small>{command.shortcut || "Command"}</small></span>
      </button>)}
      {results.map((chat, index) => <button
        key={chat.id}
        id={`search-result-${chat.id}`}
        role="option"
        aria-selected={selectedIndex === index}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={() => selectResult(index)}
      >
        <AvatarStack users={chat.participants} avatars={avatars} />
        <span className="search-result-copy">
          <strong><HighlightedText text={chat.project_name || ""} query={query} /></strong>
        </span>
        {selectedIndex === index && <span className="search-result-enter" aria-hidden="true">↵</span>}
      </button>)}
      {!results.length && <div className="search-empty" role="status">
        <Search size={18} aria-hidden="true" />
        <span>{query ? "No chats or projects match that search." : "No chats yet."}</span>
      </div>}
    </div>
  </Dialog>;
}
