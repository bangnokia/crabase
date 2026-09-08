import { useRef, useState, type CSSProperties } from "react";
import {
  Folder,
  FolderOpen,
  Loader2,
  PanelLeft,
  Plus,
  Search,
  Settings,
  SquarePen,
} from "lucide-react";
import type { Avatars, Chat, Project } from "../types";
import { Avatar, AvatarStack } from "./Avatar";
import { Crab } from "./Crab";
import { IconButton } from "./ui";
import { clampSidebarWidth } from "../lib/layout";
type Props = {
  projects: Project[];
  chats: Chat[];
  selected: string;
  name: string;
  avatars: Avatars;
  visible: boolean;
  hidden: boolean;
  close: () => void;
  open: (id: string) => void;
  newChat: (project?: string) => void;
  showDialog: (dialog: "search" | "project" | "settings") => void;
};
function ChatLink({
  chat,
  selected,
  avatars,
  open,
}: {
  chat: Chat;
  selected: string;
  avatars: Avatars;
  open: (id: string) => void;
}) {
  return (
    <button
      className={`chat-link ${selected === chat.id ? "selected" : ""}`}
      aria-current={selected === chat.id ? "page" : undefined}
      onClick={() => open(chat.id)}
      title={chat.title}
    >
      <AvatarStack users={chat.participants} avatars={avatars} />
      <span className="truncate">{chat.title}</span>
      {chat.status !== "idle" && (
        <Loader2
          size={13}
          className="spin chat-progress"
          aria-label={chat.status}
        />
      )}
    </button>
  );
}
export function Sidebar({
  projects,
  chats,
  selected,
  name,
  avatars,
  visible,
  hidden,
  close,
  open,
  newChat,
  showDialog,
}: Props) {
  const [width, setWidth] = useState(232);
  const dragOffset = useRef(0);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(true);
  return (
    <>
      {visible && (
        <button
          className="sidebar-scrim"
          aria-label="Close sidebar"
          onClick={close}
        />
      )}
      <aside
        className={`sidebar ${visible ? "mobile-open" : ""} ${hidden ? "desktop-hidden" : ""}`}
        aria-label="Workspace sidebar"
        id="workspace-sidebar"
        style={{ "--sidebar-width": `${width}px` } as CSSProperties}
      >
        <div className="brand-row">
          <button className="brand" onClick={() => newChat()}>
            <Crab size={26} />
            <span>crabase</span>
          </button>
          <IconButton label="Close sidebar" onClick={close}>
            <PanelLeft size={17} />
          </IconButton>
        </div>
        <nav aria-label="Workspace" className="primary-nav">
          <button
            className={`nav-item ${!selected ? "selected" : ""}`}
            onClick={() => newChat()}
          >
            <SquarePen size={17} />
            <span>New chat</span>
            <kbd>⌘ N</kbd>
          </button>
          <button className="nav-item" onClick={() => showDialog("search")}>
            <Search size={17} />
            <span>Search chats</span>
            <kbd>⌘ K</kbd>
          </button>
        </nav>
        <div className="sidebar-scroll">
          <div className="section-label">Chats</div>
          {chats
            .filter((chat) => !chat.project_id && !chat.archived)
            .map((chat) => (
              <ChatLink key={chat.id} {...{ chat, selected, avatars, open }} />
            ))}
          <div className="section-label">
            <button
              aria-expanded={projectsOpen}
              aria-controls="project-list"
              onClick={() => setProjectsOpen(!projectsOpen)}
            >
              Projects
            </button>
            <IconButton
              label="Add project"
              onClick={() => showDialog("project")}
            >
              <Plus size={15} />
            </IconButton>
          </div>
          {projectsOpen && (
            <div id="project-list">
              {projects.map((project) => {
                const expanded = !collapsed.includes(project.id);
                return (
                  <section
                    className="project-group"
                    key={project.id}
                    aria-label={project.name}
                  >
                    <div className="project-row">
                      <button
                        className="project-label"
                        aria-expanded={expanded}
                        aria-controls={`project-${project.id}`}
                        onClick={() =>
                          setCollapsed(
                            expanded
                              ? [...collapsed, project.id]
                              : collapsed.filter((id) => id !== project.id),
                          )
                        }
                      >
                        {expanded ? (
                          <FolderOpen size={16} />
                        ) : (
                          <Folder size={16} />
                        )}
                        <span className="truncate">{project.name}</span>
                      </button>
                      <IconButton
                        label={`New chat in ${project.name}`}
                        onClick={() => newChat(project.id)}
                      >
                        <Plus size={15} />
                      </IconButton>
                    </div>
                    {expanded && (
                      <div
                        id={`project-${project.id}`}
                        className="project-chats"
                      >
                        {chats
                          .filter(
                            (chat) =>
                              chat.project_id === project.id && !chat.archived,
                          )
                          .map((chat) => (
                            <ChatLink
                              key={chat.id}
                              {...{ chat, selected, avatars, open }}
                            />
                          ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
        <div className="profile-row">
          <button
            className="profile-button"
            onClick={() => showDialog("settings")}
          >
            <Avatar user={name} avatars={avatars} />
            <span>{name}</span>
          </button>
          <IconButton label="Settings" onClick={() => showDialog("settings")}>
            <Settings size={17} />
          </IconButton>
        </div>
        <div
          className="sidebar-resize"
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-controls="workspace-sidebar"
          aria-valuemin={200}
          aria-valuemax={700}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            dragOffset.current = event.clientX - width;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              setWidth(clampSidebarWidth(event.clientX - dragOffset.current));
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            setWidth((value) =>
              clampSidebarWidth(
                event.key === "Home"
                  ? 200
                  : event.key === "End"
                    ? 700
                    : value + (event.key === "ArrowLeft" ? -16 : 16),
              ),
            );
          }}
        />
      </aside>
    </>
  );
}
