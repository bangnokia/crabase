import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  ArrowUpRight,
  Plus,
  Search,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  SquarePen,
  Settings,
  Monitor,
  Check,
  X,
  MessageSquare,
  Activity,
  Archive,
  Copy,
  Terminal,
  FileCode2,
  Lightbulb,
  Code2,
  Square,
  Loader2,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@fontsource-variable/dm-sans";
import "./style.css";

type Project = { id: string; name: string; path: string };
type Chat = {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
  archived: number;
  updated_at: string;
  project_name: string | null;
};
type Message = {
  id: number;
  role: string;
  author: string;
  body: string;
  created_at: string;
};
type Approval = { id: number; method: string; details: string };
type Event = {
  id: number;
  chat_id: string;
  label: string;
  title: string;
  created_at: string;
};
type CodexModel = {
  model: string;
  displayName: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: { reasoningEffort: string; description: string }[];
};
type Snapshot = {
  agentName: string;
  models: CodexModel[];
  projects: Project[];
  chats: Chat[];
  events: Event[];
  runtime: string;
};
const empty: Snapshot = {
  agentName: "Crab",
  models: [],
  projects: [],
  chats: [],
  events: [],
  runtime: "offline",
};
function Crab({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 27V17h16v10H12Z" fill="currentColor" />
      <path
        d="M8 11v9l5 4m19-13v9l-5 4M8 10l-3 3m3-3 3 3m21-3-3 3m3-3 3 3M15 27v5m10-5v5M16 13v4m8-4v4M12 26l-5 4m21-4 5 4"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="21" r="1" fill="var(--surface)" />
      <circle cx="23" cy="21" r="1" fill="var(--surface)" />
    </svg>
  );
}
function time(value: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60000),
  );
  return mins < 1
    ? "Just now"
    : mins < 60
      ? `${mins}m`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h`
        : new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
}
function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={close}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function App() {
  const [data, setData] = useState<Snapshot>(empty),
    [loaded, setLoaded] = useState(false),
    [live, setLive] = useState(false);
  const chatFromUrl = () => location.pathname.startsWith("/chat/") ? location.pathname.slice(6) : "";
  const [selected, setSelected] = useState(chatFromUrl),
    [project, setProject] = useState("");
  const [avatar, setAvatar] = useState(localStorage.getItem("crabase.avatar") || "🙂");
  const [messages, setMessages] = useState<Message[]>([]),
    [approvals, setApprovals] = useState<Approval[]>([]);
  const [view, setView] = useState("home"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(""),
    [sidebar, setSidebar] = useState(false),
    [sidebarHidden, setSidebarHidden] = useState(false),
    [details, setDetails] = useState(false);
  const [draft, setDraft] = useState(""),
    [mode, setMode] = useState("agent"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [toast, setToast] = useState(""),
    [collapsed, setCollapsed] = useState<string[]>([]);
  const [name, setName] = useState(() => {
    const requested = new URLSearchParams(location.search).get("user");
    const saved = sessionStorage.getItem("crabase.test-user");
    return (
      [requested, saved].find((user) => user === "user1" || user === "user2") ||
      "user1"
    );
  });
  const [theme, setTheme] = useState(
    localStorage.getItem("crabase.theme") || "light",
  );
  const [model, setModel] = useState(
    sessionStorage.getItem("crabase.model") || "",
  );
  const [effort, setEffort] = useState(
    sessionStorage.getItem("crabase.effort") || "",
  );
  const chosenModel =
    data.models.find((entry) => entry.model === model) ||
    data.models.find((entry) => entry.isDefault) ||
    data.models[0];
  const reasoning = chosenModel?.supportedReasoningEfforts || [];
  const chosenEffort = !reasoning.length
    ? ""
    : reasoning.some((entry) => entry.reasoningEffort === effort)
      ? effort
      : chosenModel?.defaultReasoningEffort || "";
  useEffect(() => {
    if (!chosenModel) return;
    sessionStorage.setItem("crabase.model", chosenModel?.model || "");
    sessionStorage.setItem("crabase.effort", chosenEffort);
  }, [chosenModel?.model, chosenEffort]);
  const socketRef = useRef<WebSocket | null>(null);
  const sequence = useRef(0);
  const pending = useRef(
    new Map<
      number,
      {
        resolve: (data: any) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const selectedRef = useRef(selected),
    composer = useRef<HTMLTextAreaElement>(null),
    end = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null),
    stick = useRef(true);
  const chat = data.chats.find((c) => c.id === selected),
    currentProject = data.projects.find(
      (p) => p.id === (chat?.project_id || project),
    );
  const active = chat && chat.status !== "idle";
  const agentName = data.agentName || "Crab";
  selectedRef.current = selected;
  function request<T = unknown>(
    action: string,
    data: unknown = {},
  ): Promise<T> {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN)
      return Promise.reject(
        new Error(
          "Workspace disconnected. Wait for reconnection before sending.",
        ),
      );
    const id = ++sequence.current;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current.delete(id);
        reject(
          new Error(
            "Confirmation timed out. Check the thread before retrying; your action may have been saved.",
          ),
        );
        socket.close();
      }, 15000);
      pending.current.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, action, data }));
    });
  }
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout>,
      disposed = false;
    const rejectPending = () => {
      for (const entry of pending.current.values()) {
        clearTimeout(entry.timer);
        entry.reject(
          new Error(
            "Connection lost before confirmation. Check the thread after reconnecting before retrying.",
          ),
        );
      }
      pending.current.clear();
    };
    function connect() {
      const endpoint =
        location.port === "5173"
          ? `${location.host}/live`
          : `${location.hostname}:8788`;
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${endpoint}`,
      );
      socketRef.current = socket;
      socket.onopen = () => {
        if (!disposed) setLive(true);
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        const packet = JSON.parse(event.data);
        if (typeof packet.id === "number") {
          const entry = pending.current.get(packet.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          pending.current.delete(packet.id);
          if (packet.error) entry.reject(new Error(packet.error));
          else entry.resolve(packet.result);
          return;
        }
        if (packet.type !== "patch") return;
        if (packet.state)
          setData((previous) => ({ ...previous, ...packet.state }));
        if (packet.chat_id === selectedRef.current) {
          if (packet.messages || packet.append)
            setMessages((previous) => {
              const items = new Map(
                previous.map((message) => [message.id, message]),
              );
              for (const message of packet.messages || [])
                items.set(message.id, message);
              for (const append of packet.append || []) {
                const message = items.get(append.id);
                if (message)
                  items.set(append.id, {
                    ...message,
                    body: message.body + append.delta,
                  });
              }
              return [...items.values()].sort((a, b) => a.id - b.id);
            });
          if (packet.approvals) setApprovals(packet.approvals);
        }
      };
      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        setLive(false);
        rejectPending();
        retry = setTimeout(connect, 1000);
      };
    }
    connect();
    const route = () => {
      setSelected(chatFromUrl());
      setView("home");
    };
    window.addEventListener("popstate", route);
    return () => {
      disposed = true;
      clearTimeout(retry);
      rejectPending();
      socketRef.current?.close();
      window.removeEventListener("popstate", route);
    };
  }, []);
  useEffect(() => {
    setMessages([]);
    setApprovals([]);
    stick.current = true;
    if (!live) return;
    const id = selected;
    let stale = false;
    request<{
      state: Snapshot;
      thread: { messages: Message[]; approvals: Approval[] } | null;
    }>("sync", { chat_id: id || null })
      .then((result) => {
        if (stale) return;
        setData(result.state);
        setLoaded(true);
        setMessages(result.thread?.messages || []);
        setApprovals(result.thread?.approvals || []);
      })
      .catch((error) => {
        if (!stale) setError(error.message);
      });
    return () => {
      stale = true;
    };
  }, [selected, live]);
  useEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("crabase.theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("crabase.avatar", avatar); }, [avatar]);
  useEffect(() => {
    sessionStorage.setItem("crabase.test-user", name);
    // Consume the launch selector; reloading and shared thread links keep each tab's identity.
    const url = new URL(location.href);
    if (url.searchParams.has("user")) {
      url.searchParams.delete("user");
      history.replaceState(null, "", url);
    }
  }, [name]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setDialog("search");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setSelected("");
        setProject("");
        history.pushState(null, "", "/");
        setView("home");
        setDraft("");
        setDialog("");
      }
      if (e.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function open(id: string) {
    setSelected(id);
    history.pushState(null, "", id ? `/chat/${id}` : "/");
    setView("home");
    setSidebar(false);
    setDialog("");
    setDraft("");
    setError("");
  }
  function home() {
    open("");
    setFilter("all");
  }
  async function mutate(action: string, body: unknown) {
    try {
      setError("");
      const r = await request(action, body);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  async function send(sendMode = mode) {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      let id = selected;
      const text = draft.trim();
      if (!id) {
        const created = await request<{ id: string }>("create", {
          project_id: project || null,
          title: text.slice(0, 90),
        });
        id = created.id;
        setSelected(id);
        selectedRef.current = id;
        history.pushState(null, "", `/chat/${id}`);
      }
      await request("message", {
        chat_id: id,
        body: text,
        mode: sendMode,
        author: name.trim() || "You",
        ...(mode === "agent" && chosenModel
          ? { model: chosenModel.model, effort: chosenEffort || null }
          : {}),
      });
      setDraft("");
      stick.current = true;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      composer.current?.focus();
    }
  }
  async function archive() {
    if (
      await mutate("archive", { chat_id: selected, archived: !chat?.archived })
    ) {
      setToast(chat?.archived ? "Thread restored" : "Thread archived");
      home();
    }
  }
  const projectChats = data.chats.filter(
    (c) => (c.project_id || "") === project,
  );
  const shown = projectChats.filter((c) =>
    filter === "archived"
      ? c.archived
      : !c.archived && (filter !== "active" || c.status !== "idle"),
  );
  const results = data.chats.filter(
    (c) =>
      !c.archived &&
      `${c.title} ${c.project_name || "Chat"}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const composerUI = (
    <div className={`composer-wrap ${selected ? "in-thread" : ""}`}>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <IconButton label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </IconButton>
        </div>
      )}
      {chat?.archived ? (
        <div className="archived-notice">
          <Archive size={17} /> This thread is archived.
          <button onClick={archive}>Restore thread</button>
        </div>
      ) : (
        <div className="composer-box">
          <textarea
            ref={composer}
            aria-label={
              mode === "agent" ? `Message ${agentName}` : "Write a team note"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send("note");
              }
            }}
            placeholder="Write to the team…"
            rows={selected ? 2 : 3}
            maxLength={20000}
          />
          <div className="composer-controls">
            <div className="composer-options">
              {true ? (
                <div className="agent-options">
                  <span className="mode-select model-select">
                    <select
                      aria-label="Model"
                      value={chosenModel?.model || ""}
                      disabled={!data.models.length}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setEffort("");
                      }}
                    >
                      {!data.models.length && (
                        <option value="">
                          {data.runtime === "error"
                            ? "Models unavailable"
                            : "Loading models…"}
                        </option>
                      )}
                      {data.models.map((entry) => (
                        <option key={entry.model} value={entry.model}>
                          {entry.displayName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} />
                  </span>
                  <span className="mode-select reasoning-select">
                    <select
                      aria-label="Reasoning level"
                      value={chosenEffort}
                      disabled={!reasoning.length}
                      onChange={(e) => setEffort(e.target.value)}
                    >
                      {!reasoning.length && (
                        <option value="">Reasoning unavailable</option>
                      )}
                      {reasoning.map((entry) => (
                        <option
                          key={entry.reasoningEffort}
                          value={entry.reasoningEffort}
                        >
                          {entry.reasoningEffort.charAt(0).toUpperCase() +
                            entry.reasoningEffort.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} />
                  </span>
                  {data.runtime === "error" && (
                    <button
                      className="model-retry"
                      onClick={() => void mutate("models", {})}
                    >
                      Retry models
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="send-controls">
              {active && (
                <IconButton
                  label="Stop agent and queued requests"
                  onClick={() => void mutate("cancel", { chat_id: selected })}
                >
                  <Square size={15} />
                </IconButton>
              )}
              <button
                className="agent-send-button"
                aria-label={`Ask ${agentName}`}
                title={`Ask ${agentName}`}
                disabled={
                  !draft.trim() || busy || !loaded || !live || !chosenModel
                }
                onClick={() => void send("agent")}
              >
                <Crab size={16} />
              </button>
              <button
                className="send-button"
                aria-label={"Send team message"}
                disabled={
                  !draft.trim() ||
                  busy ||
                  !loaded ||
                  !live ||
                  (mode === "agent" && !chosenModel)
                }
                onClick={() => void send()}
              >
                {busy ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <ArrowUp size={19} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="composer-foot">
        <span>
          ↵ to send <span className="foot-dot">·</span> ⇧ ↵ for new line
        </span>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close sidebar"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebar ? "mobile-open" : ""} ${sidebarHidden ? "desktop-hidden" : ""}`}
      >
        <div className="brand-row">
          <button
            className="brand"
            onClick={() => {
              setProject("");
              home();
            }}
          >
            <Crab size={30} />
            <span>crabase</span>
            <span className="preview-badge">preview</span>
          </button>
          <IconButton
            label="Toggle sidebar"
            onClick={() => {
              if (window.innerWidth <= 760) setSidebar(false);
              else setSidebarHidden(true);
            }}
            className="sidebar-toggle"
          >
            <PanelLeft size={17} />
          </IconButton>
        </div>
        <nav className="primary-nav" aria-label="Workspace">
          <button
            className={
              !selected && view === "home" ? "nav-item selected" : "nav-item"
            }
            onClick={() => {
              setProject("");
              home();
            }}
          >
            <SquarePen size={17} />
            <span>New chat</span>
            <kbd>⌘ N</kbd>
          </button>
          <button className="nav-item" onClick={() => setDialog("search")}>
            <Search size={17} />
            <span>Search threads</span>
            <kbd>⌘ K</kbd>
          </button>
        </nav>
        <div className="project-tree">
          <div className="sidebar-section-label">
            <span>Chats</span>
          </div>
          {data.chats
            .filter((c) => !c.project_id && !c.archived)
            .map((c) => (
              <button
                key={c.id}
                className={`thread-link ${selected === c.id ? "current" : ""}`}
                onClick={() => open(c.id)}
              >
                <span>{c.title}</span>
              </button>
            ))}
          <div className="sidebar-section-label">
            <span onClick={() => setCollapsed(data.projects.map((p) => p.id))}>Projects</span>
            <IconButton
              label="Add project"
              onClick={() => setDialog("project")}
            >
              <Plus size={15} />
            </IconButton>
          </div>

          {data.projects.map((p) => (
            <div key={p.id} className="project-group">
              <div className="project-row">
                <button
                  className="project-label"
                  onClick={() => {
                    setProject(p.id);
                    setCollapsed(
                      collapsed.includes(p.id)
                        ? collapsed.filter((id) => id !== p.id)
                        : [...collapsed, p.id],
                    );
                  }}
                >
                  {collapsed.includes(p.id) ? <Folder size={16} /> : <FolderOpen size={16} />}
                  <span>{p.name}</span>
                </button>
                <IconButton
                  label={`New thread in ${p.name}`}
                  onClick={() => {
                    setProject(p.id);
                    home();
                    composer.current?.focus();
                  }}
                >
                  <Plus size={14} />
                </IconButton>
              </div>
              {!collapsed.includes(p.id) && (
                <div className="thread-tree">
                  {data.chats
                    .filter((c) => c.project_id === p.id && !c.archived)
                    .slice(0, 8)
                    .map((c) => (
                      <button
                        key={c.id}
                        className={`thread-link ${selected === c.id && view === "home" ? "current" : ""}`}
                        onClick={() => open(c.id)}
                      >
                        <span
                          className={`thread-status ${c.status === "idle" ? "" : "working"}`}
                        >
                          {c.status === "idle" ? <Users size={13} /> : (
                            <Loader2 size={13} className="spin" />
                          )}
                        </span>
                        <span>{c.title}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <button
              className="profile-button"
              onClick={() => setDialog("settings")}
            >
              <span className={`avatar avatar-${name}`}>{avatar}</span>
              <span>
                <strong>{name}</strong>
              </span>
            </button>
            <IconButton label="Settings" onClick={() => setDialog("settings")}>
              <Settings size={18} />
            </IconButton>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              label="Open sidebar"
              className={`mobile-menu ${sidebarHidden ? "desktop-show" : ""}`}
              onClick={() => {
                setSidebar(true);
                setSidebarHidden(false);
              }}
            >
              <PanelLeft size={18} />
            </IconButton>
            <span className="breadcrumb-project">
              {currentProject?.name || "Chat"}
            </span>
            <span className="slash">/</span>
            <span>
              {view === "activity" ? "Activity" : chat?.title || "New thread"}
            </span>
          </div>
          <div className="topbar-actions">
            {selected && view !== "activity" && (
              <IconButton
                label="Copy thread link"
                onClick={() => {
                  navigator.clipboard
                    .writeText(location.href)
                    .then(() => setToast("Thread link copied"))
                    .catch(() =>
                      setError(
                        "Unable to access clipboard. Copy the address from your browser.",
                      ),
                    );
                }}
              >
                <Copy size={16} />
              </IconButton>
            )}
            <IconButton
              label="Workspace activity panel"
              onClick={() => setDetails(!details)}
            >
              <PanelLeft size={18} style={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </div>
        </header>
        <div className="content-layout">
          <div className="main-content">
            {view === "activity" ? (
              <section className="activity-page">
                <div className="page-eyebrow">
                  <Activity size={15} /> WORKSPACE
                </div>
                <h1>A little progress, every day.</h1>
                <p className="page-subtitle">
                  Threads, notes, and agent work across your projects.
                </p>
                <div className="activity-list">
                  {data.events.length ? (
                    data.events.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => e.chat_id && open(e.chat_id)}
                        className="activity-event"
                      >
                        <span className="event-icon">
                          <MessageSquare size={16} />
                        </span>
                        <span>
                          <strong>
                            {e.label
                              .replace(/^Codex turn /, `${agentName} turn `)
                              .replace(/ asked Codex$/, ` asked ${agentName}`)}
                          </strong>
                          <small>{e.title || "Workspace"}</small>
                        </span>
                        <time>{time(e.created_at)}</time>
                        {e.chat_id && <ArrowUpRight size={16} />}
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Activity size={28} />
                      <h3>Your story starts here</h3>
                      <p>
                        Start a thread or leave a note. Your workspace activity
                        will appear here.
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => {
                          setProject("");
                          home();
                        }}
                      >
                        Start a thread
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : selected ? (
              <>
                <div
                  className="conversation"
                  ref={scrollArea}
                  onScroll={() => {
                    const el = scrollArea.current;
                    if (el)
                      stick.current =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                  }}
                >
                  <div className="conversation-inner">
                    {messages.map((m) => (
                      <article key={m.id} className={`message ${m.role}`}>
                        {m.role === "tool" ? (
                          <details className="tool-output">
                            <summary>
                              <Terminal size={14} />
                              <span>{m.author}</span>
                              <code>{m.body.split("\n")[0].slice(0, 90)}</code>
                              <ChevronDown size={14} />
                            </summary>
                            <pre>{m.body}</pre>
                          </details>
                        ) : (
                          <>
                            <div className="message-author">
                              <span
                                className={`message-avatar ${m.role === "assistant" || m.role === "guide" ? "agent-avatar" : ""}`}
                              >
                                {m.role === "assistant" ||
                                m.role === "guide" ? (
                                  <Crab size={23} />
                                ) : (
                                  m.author === "user2" ? "😎" : "🙂"
                                )}
                              </span>
                              <strong>
                                {m.role === "assistant" || m.role === "error"
                                  ? agentName
                                  : m.author}
                              </strong>
                              {m.role === "guide" && (
                                <span className="message-tag">
                                  Getting started
                                </span>
                              )}
                              {m.role === "note" && (
                                <span className="message-tag">Note</span>
                              )}
                              <time>{time(m.created_at)}</time>
                            </div>
                            <div className="message-body">
                              <Markdown remarkPlugins={[remarkGfm]}>
                                {(m.role === "guide"
                                  ? m.body.replaceAll("Codex", agentName)
                                  : m.body) || "…"}
                              </Markdown>
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                    {approvals.map((a) => (
                      <div className="approval" key={a.id}>
                        <h3>{agentName} needs your approval</h3>
                        <pre>
                          {(() => {
                            try {
                              const d = JSON.parse(a.details);
                              return (
                                d.command ||
                                d.reason ||
                                JSON.stringify(d, null, 2)
                              );
                            } catch {
                              return a.details;
                            }
                          })()}
                        </pre>
                        <div>
                          <button
                            className="secondary-button"
                            onClick={() =>
                              void mutate("approval", {
                                chat_id: selected,
                                approval_id: a.id,
                                decision: "decline",
                              })
                            }
                          >
                            Decline
                          </button>
                          <button
                            className="primary-button"
                            onClick={() =>
                              void mutate("approval", {
                                chat_id: selected,
                                approval_id: a.id,
                                decision: "accept",
                              })
                            }
                          >
                            Approve once
                          </button>
                        </div>
                      </div>
                    ))}
                    {active && (
                      <div className="working-indicator">
                        <Loader2 size={15} className="spin" />
                        {chat.status === "queued"
                          ? "Waiting for the workspace agent…"
                          : chat.status === "approval"
                            ? "Waiting for your approval…"
                            : `${agentName} is working…`}
                      </div>
                    )}
                    <div ref={end} />
                  </div>
                </div>
                {composerUI}
              </>
            ) : (
              <div className="home-scroll">
                <section className="welcome">
                  <div className="welcome-mark">
                    <Crab size={42} />
                  </div>
                  <h1>
                    {project ? "What should we build?" : "What’s on your mind?"}
                  </h1>
                  <div className="project-picker">
                    <Folder size={15} />
                    <select
                      aria-label="Current project"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                    >
                      <option value="">No project</option>
                      {data.projects.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                  {composerUI}
                  {/* suggestions removed */}{false && <div className="suggestions">
                    {(project
                      ? [
                          {
                            icon: <Code2 size={17} />,
                            title: "Explore the codebase",
                            text: "Walk me through this repository. Explain the architecture and how to run it.",
                          },
                          {
                            icon: <Lightbulb size={17} />,
                            title: "Plan a feature",
                            text: "Help me plan a new feature for this project. First, explore the existing code and ask what I want to build.",
                          },
                          {
                            icon: <FileCode2 size={17} />,
                            title: "Review recent changes",
                            text: "Review the current uncommitted changes for bugs and explain any important findings.",
                          },
                        ]
                      : [
                          {
                            icon: <Lightbulb size={17} />,
                            title: "Brainstorm an idea",
                            text: "Help me brainstorm an idea. Ask me what I have in mind.",
                          },
                          {
                            icon: <MessageSquare size={17} />,
                            title: "Think it through",
                            text: "Help me think through a decision. Ask me about the situation.",
                          },
                          {
                            icon: <FileCode2 size={17} />,
                            title: "Draft something",
                            text: "Help me write a draft. Ask me what I want to write and who it is for.",
                          },
                        ]
                    ).map((s) => (
                      <button
                        key={s.title}
                        onClick={() => {
                          setMode("agent");
                          setDraft(s.text);
                          composer.current?.focus();
                        }}
                      >
                        {s.icon}
                        <span>{s.title}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>}
                </section>
                <section className="recent-section">
                  <div className="recent-heading">
                    <div
                      className="list-tabs"
                      role="tablist"
                      aria-label="Filter threads"
                    >
                      {[
                        ["all", "Recent threads"],
                        ["active", "In progress"],
                        ["archived", "Archived"],
                      ].map(([id, label]) => (
                        <button
                          role="tab"
                          aria-selected={filter === id}
                          className={filter === id ? "active" : ""}
                          key={id}
                          onClick={() => setFilter(id)}
                        >
                          {label}
                          {id === "active" &&
                            projectChats.filter(
                              (c) => !c.archived && c.status !== "idle",
                            ).length > 0 && (
                              <span className="count">
                                {
                                  projectChats.filter(
                                    (c) => !c.archived && c.status !== "idle",
                                  ).length
                                }
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                    <IconButton
                      label="Search all threads"
                      onClick={() => setDialog("search")}
                    >
                      <Search size={15} />
                    </IconButton>
                  </div>
                  <div className="recent-list">
                    {!loaded ? (
                      <div className="list-empty">
                        <Loader2 size={17} className="spin" /> Connecting to
                        your workspace…
                      </div>
                    ) : shown.length ? (
                      shown.slice(0, 8).map((c) => (
                        <button
                          className="recent-thread"
                          key={c.id}
                          onClick={() => open(c.id)}
                        >
                          <span
                            className={`recent-icon ${c.status !== "idle" ? "working" : ""}`}
                          >
                            {c.status !== "idle" ? (
                              <Loader2 size={17} className="spin" />
                            ) : (
                              <MessageSquare size={17} />
                            )}
                          </span>
                          <span className="recent-name">
                            <strong>{c.title}</strong>
                            <small>
                              {c.project_name || "Chat"} <span>·</span>{" "}
                              {c.status === "idle"
                                ? "Shared thread"
                                : c.status === "queued"
                                  ? "Queued"
                                  : "Agent working"}
                            </small>
                          </span>
                          <span className="recent-time">
                            {time(c.updated_at)}
                          </span>
                          <ChevronRight size={15} className="row-arrow" />
                        </button>
                      ))
                    ) : (
                      <div className="list-empty">
                        {filter === "active"
                          ? "All quiet. No agent tasks running."
                          : filter === "archived"
                            ? "Archived threads will appear here."
                            : "Your next idea deserves a thread. Start one above."}
                      </div>
                    )}
                  </div>
                  <div className="recent-footer">
                    <span>
                      <Users size={13} /> Built for working together
                    </span>
                    <button onClick={() => setDialog("about")}>
                      About this workspace <ArrowUpRight size={12} />
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
          {details && (
            <aside className="details-panel">
              <div className="details-title">
                <strong>Workspace</strong>
                <IconButton
                  label="Close activity panel"
                  onClick={() => setDetails(false)}
                >
                  <X size={16} />
                </IconButton>
              </div>
              <div className="detail-project">
                <Folder size={22} />
                <h3>{currentProject?.name}</h3>
                <p>{currentProject?.path}</p>
              </div>
              <div className="detail-label">CONNECTION</div>
              <div className="detail-row">
                <Monitor size={15} />
                <span>PHP server</span>
                <span className={live ? "green-text" : ""}>
                  {live ? "Online" : "Offline"}
                </span>
              </div>
              <div className="detail-row">
                <Crab size={18} />
                <span>{agentName}</span>
                <span>{data.runtime === "ready" ? "Ready" : data.runtime}</span>
              </div>
              <div className="detail-label">RECENT ACTIVITY</div>
              {data.events.slice(0, 8).map((e) => (
                <div className="mini-event" key={e.id}>
                  <span className="event-dot" />
                  <div>
                    {e.label
                      .replace(/^Codex turn /, `${agentName} turn `)
                      .replace(/ asked Codex$/, ` asked ${agentName}`)}
                    <small>{time(e.created_at)}</small>
                  </div>
                </div>
              ))}
              {!data.events.length && (
                <p className="detail-empty">
                  Updates will appear here as you work.
                </p>
              )}
              <div className="local-info">
                <Monitor size={16} />
                <p>
                  This preview runs on your machine. Team sign-in is not
                  configured yet.
                </p>
              </div>
            </aside>
          )}
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {dialog === "search" && (
        <Dialog title="Find a thread" close={() => setDialog("")}>
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search threads and projects…"
              aria-label="Search threads"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {results.map((c) => (
              <button key={c.id} onClick={() => open(c.id)}>
                <MessageSquare size={17} />
                <span>
                  <strong>{c.title}</strong>
                  <small>{c.project_name || "Chat"}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {!results.length && (
              <div className="list-empty">No threads match “{search}”.</div>
            )}
          </div>
        </Dialog>
      )}
      {dialog === "project" && (
        <Dialog title="Add a project" close={() => setDialog("")}>
          <p className="dialog-description">
            Connect a folder on this machine. {agentName} will use it as the
            working directory for this project.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              const result = (await mutate("project", {
                name: f.get("name"),
                path: f.get("path"),
              })) as { id: string } | null;
              setBusy(false);
              if (result) {
                setProject(result.id);
                home();
                setToast("Project added");
              }
            }}
          >
            <label>
              Project name
              <input
                name="name"
                required
                maxLength={80}
                placeholder="My next big thing"
                autoFocus
              />
            </label>
            <label>
              Folder path
              <input
                name="path"
                required
                placeholder="/Users/you/Code/my-project"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDialog("")}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Adding…" : "Add project"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "settings" && (
        <Dialog title="Make yourself at home" close={() => setDialog("")}>
          <p className="dialog-description">
            A few preferences for your local workspace.
          </p>
          <label>
            Test user for this tab
            <select
              className="test-user-select"
              value={name}
              onChange={(e) =>
                setName(e.target.value === "user2" ? "user2" : "user1")
              }
            >
              <option value="user1">user1</option>
              <option value="user2">user2</option>
            </select>
          </label>
          <label>Avatar
            <select value={avatar} onChange={(e) => setAvatar(e.target.value)}>
              {['🙂','😎','🌟','🐱','🚀'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label>Appearance</label>
          <div className="theme-options">
            {[
              ["light", "Light"],
              ["dark", "Dark"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={theme === id ? "chosen" : ""}
                onClick={() => setTheme(id)}
              >
                {id === "light" ? <Sun size={20} /> : <Moon size={20} />}
                <span>{label}</span>
                {theme === id && <Check size={16} />}
              </button>
            ))}
          </div>
          <div className="settings-info">
            <Monitor size={18} />
            <div>
              <strong>Local preview</strong>
              <p>
                user1 and user2 are dummy identities for collaboration testing.
                Each tab keeps its own selection. These are not authenticated
                accounts.
              </p>
            </div>
          </div>
          <div className="dialog-actions">
            <button className="primary-button" onClick={() => setDialog("")}>
              Done
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "about" && (
        <Dialog title="A shared place to build." close={() => setDialog("")}>
          <div className="about-mark">
            <Crab size={48} />
          </div>
          <p className="about-copy">
            Crabase brings conversations, code, and agent work into one calm
            workspace.
          </p>
          <div className="about-features">
            <div>
              <MessageSquare size={18} />
              <span>
                <strong>Keep the context</strong>
                <small>Chats and notes persist in SQLite.</small>
              </span>
            </div>
            <div>
              <Terminal size={18} />
              <span>
                <strong>Build on your machine</strong>
                <small>{agentName} works inside your project folder.</small>
              </span>
            </div>
            <div>
              <Activity size={18} />
              <span>
                <strong>Follow the work</strong>
                <small>Live updates across your open browsers.</small>
              </span>
            </div>
          </div>
          <p className="about-note">
            This is the local foundation. Team accounts, isolated task
            worktrees, and network deployment come next.
          </p>
          <button
            className="primary-button full-width"
            onClick={() => setDialog("")}
          >
            Let's build something
          </button>
        </Dialog>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
