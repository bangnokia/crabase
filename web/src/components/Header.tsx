import { Copy, PanelLeft, PanelRight, SquareTerminal } from "lucide-react";
import type { Chat, Project } from "../types";
import { IconButton } from "./ui";
export function Header({
  chat,
  project,
  showSidebar,
  sidebarHidden,
  toggleDetails,
  detailsOpen,
  toggleTerminal,
  terminalOpen,
  copy,
}: {
  chat?: Chat;
  project?: Project;
  showSidebar: () => void;
  sidebarHidden: boolean;
  toggleDetails: () => void;
  detailsOpen: boolean;
  toggleTerminal: () => void;
  terminalOpen: boolean;
  copy: () => void;
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
        <IconButton
          className={detailsOpen ? "active" : ""}
          label="Artifacts and agent activity"
          aria-pressed={detailsOpen}
          onClick={toggleDetails}
        >
          <PanelRight size={18} />
        </IconButton>
      </div>
    </header>
  );
}
