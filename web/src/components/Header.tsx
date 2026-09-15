import { Copy, FileCode2, PanelLeft, PanelRight, SquareTerminal } from "lucide-react";
import type { Avatars, Chat, Project } from "../types";
import { IconButton } from "./ui";
import { AvatarStack } from "./Avatar";
export function Header({
  chat,
  project,
  showSidebar,
  sidebarHidden,
  toggleDetails,
  detailsOpen,
  toggleCode,
  codeOpen,
  toggleTerminal,
  terminalOpen,
  copy,
  avatars,
}: {
  chat?: Chat;
  project?: Project;
  showSidebar: () => void;
  sidebarHidden: boolean;
  toggleDetails: () => void;
  detailsOpen: boolean;
  toggleCode: () => void;
  codeOpen: boolean;
  toggleTerminal: () => void;
  terminalOpen: boolean;
  copy: () => void;
  avatars: Avatars;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <IconButton
          className={`sidebar-opener ${sidebarHidden ? "show" : ""}`}
          label="Open sidebar"
          onClick={showSidebar}
        >
          <PanelLeft size={18} />
        </IconButton>
        {project && (
          <>
            <span className="breadcrumb-project truncate">{project.name}</span>
            <span className="slash">/</span>
          </>
        )}
        <span className="truncate" title={chat?.title}>
          {chat?.title || "New chat"}
        </span>
        {chat && <AvatarStack users={chat.participants} avatars={avatars} />}
      </div>
      <div className="topbar-actions">
        {chat && (
          <>
            <IconButton label="Copy chat link" onClick={copy}>
              <Copy size={16} />
            </IconButton>
            <IconButton
              className={terminalOpen ? "active" : ""}
              label={`${terminalOpen ? "Hide" : "Show"} terminal (⌘J)`}
              aria-pressed={terminalOpen}
              onClick={toggleTerminal}
            >
              <SquareTerminal size={17} />
            </IconButton>
          </>
        )}
        {project && <IconButton
          className={codeOpen ? "active" : ""}
          label={`${codeOpen ? "Hide" : "Show"} code workspace`}
          aria-pressed={codeOpen}
          onClick={toggleCode}
        >
          <FileCode2 size={18} />
        </IconButton>}
        <IconButton
          className={detailsOpen ? "active" : ""}
          label={`${detailsOpen ? "Hide" : "Open"} artifacts`}
          aria-pressed={detailsOpen}
          onClick={toggleDetails}
        >
          <PanelRight size={18} />
        </IconButton>
      </div>
    </header>
  );
}
