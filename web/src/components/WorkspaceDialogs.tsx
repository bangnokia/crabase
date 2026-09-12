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

  const query = search.trim();
  const filteredCommands = commands.filter((command) => !query || [command.label, ...(command.keywords || [])].join(" ").toLowerCase().includes(query.toLowerCase()));
  const totalResults = filteredCommands.length + results.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, totalResults - 1)));
  }, [totalResults]);

  useEffect(() => {
    const selected = selectedIndex < filteredCommands.length
      ? document.getElementById(`command-result-${filteredCommands[selectedIndex]?.id}`)
      : document.getElementById(`search-result-${results[selectedIndex - filteredCommands.length]?.id}`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [filteredCommands, results, selectedIndex]);
  const selectResult = (index: number) => {
    if (index < filteredCommands.length) { filteredCommands[index]?.run(); close(); return; }
    const chat = results[index - filteredCommands.length];
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
        aria-activedescendant={selectedIndex < filteredCommands.length
          ? (filteredCommands[selectedIndex] ? `command-result-${filteredCommands[selectedIndex].id}` : undefined)
          : (results[selectedIndex - filteredCommands.length] ? `search-result-${results[selectedIndex - filteredCommands.length].id}` : undefined)}
        placeholder="Search chats and projects…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((index) => totalResults ? (index + 1) % totalResults : 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((index) => totalResults ? (index - 1 + totalResults) % totalResults : 0);
          } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
            event.preventDefault();
            setSelectedIndex((index) => totalResults ? (index + 1) % totalResults : 0);
          } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
            event.preventDefault();
            setSelectedIndex((index) => totalResults ? (index - 1 + totalResults) % totalResults : 0);
          } else if (event.key === "Home" && totalResults) {
            event.preventDefault();
            setSelectedIndex(0);
          } else if (event.key === "End" && totalResults) {
            event.preventDefault();
            setSelectedIndex(totalResults - 1);
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
      {filteredCommands.map((command, commandIndex) => <button key={command.id} id={`command-result-${command.id}`} role="option" aria-selected={selectedIndex === commandIndex} onMouseEnter={() => setSelectedIndex(commandIndex)} onClick={() => { command.run(); close(); }}>
        <span className="search-result-copy"><strong>{command.label}</strong><small>{command.shortcut || "Command"}</small></span>
      </button>)}
      {results.map((chat, index) => <button
        key={chat.id}
        id={`search-result-${chat.id}`}
        role="option"
        aria-selected={selectedIndex === filteredCommands.length + index}
        onMouseEnter={() => setSelectedIndex(filteredCommands.length + index)}
        onClick={() => selectResult(index)}
      >
        <AvatarStack users={chat.participants} avatars={avatars} />
        <span className="search-result-copy">
          <strong><HighlightedText text={chat.project_name || ""} query={query} /></strong>
        </span>
        {selectedIndex === filteredCommands.length + index && <span className="search-result-enter" aria-hidden="true">↵</span>}
      </button>)}
      {!totalResults && <div className="search-empty" role="status">
        <Search size={18} aria-hidden="true" />
        <span>{query ? "No chats or projects match that search." : "No chats yet."}</span>
      </div>}
    </div>
  </Dialog>;
}
