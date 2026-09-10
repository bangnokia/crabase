import type { Project } from "./types";
import { ProjectDialog } from "./components/ProjectDialog";
import { WorktreeDialog } from "./components/WorktreeDialog";
import { useAuth } from "./components/AuthGate";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useRoute } from "./hooks/useRoute";
import { useWorkspace } from "./hooks/useWorkspace";
import { usePreferences } from "./hooks/usePreferences";
import { fileSearchDirection, isSidebarShortcut } from "./lib/shortcuts";
import { chatPath } from "./lib/routes";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DetailsPanel } from "./components/DetailsPanel";
import { CodePanel } from "./components/CodePanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { Composer, type SendOptions } from "./components/Composer";
import { SearchDialog } from "./components/WorkspaceDialogs";
import { SettingsPage } from "./pages/SettingsPage";
import { NewChatPage } from "./pages/NewChatPage";
import { ChatPage } from "./pages/ChatPage";
export function App() {
  const { user } = useAuth();
  const { route, navigate } = useRoute();
  useEffect(() => {
    if (user.avatar_required && route.page !== 'settings') navigate('/settings');
  }, [user.avatar_required, route.page, navigate]);
  const selected = route.page === "chat" ? route.id : "";
  const workspace = useWorkspace(selected);
  const { data, live, loaded, messages, approvals, error, setError, request } =
    workspace;
  const preferences = usePreferences(data.users);
  const [projectId, setProjectId] = useState("");
  const [worktreeProject, setWorktreeProject] = useState<Project | null>(null);
  const previousProjects = useRef(data.projects);
  const [draftVersion, setDraftVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const draftRef = useRef("");
  const draftChat = useRef('');
  function clearDraft() {
    draftChat.current = '';
    draftRef.current = "";
    setDraftVersion((version) => version + 1);
  }
  const [dialog, setDialog] = useState<"" | "search" | "project" | "settings">(
    "",
  );
  const [sidebar, setSidebar] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(
    () => localStorage.getItem("crabase-sidebar-hidden") === "true",
  );
  const [details, setDetails] = useState(() => localStorage.getItem("crabase-details-open") === "true");
  const [code, setCode] = useState(() => localStorage.getItem("crabase-code-open") === "true");
  const [fileSearch, setFileSearch] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [toast, setToast] = useState("");
  const chat = data.chats.find((item) => item.id === selected);
  const project = data.projects.find(
    (item) => item.id === (selected ? chat?.project_id : projectId),
  );
  function open(id: string) {
    setFileSearch(false);
    navigate(chatPath(id));
    setSidebar(false);
    setDialog("");
    clearDraft();
    setError("");
    setTerminal(false);
  }
  function newChat(id = "") {
    setFileSearch(false);
    setProjectId(id);
    navigate("/");
    setSidebar(false);
    setDialog("");
    clearDraft();
    setError("");
    setTerminal(false);
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey && fileSearchDirection(event) &&
        document.querySelector('.file-palette[open]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p" &&
        !event.shiftKey && !event.altKey && !event.isComposing && project) {
        if (document.querySelector('dialog[open]:not(.file-palette)')) return;
        event.preventDefault();
        setCode(true);
        setFileSearch(true);
        document.querySelector<HTMLInputElement>('.file-palette input')?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setDialog("search");
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "n") {
        event.preventDefault();
        newChat();
      }
      if (isSidebarShortcut(event)) {
        event.preventDefault();
        if (window.innerWidth <= 760) {
          setSidebarHidden(false);
          setSidebar((visible) => !visible);
        } else {
          setSidebar(false);
          setSidebarHidden((hidden) => !hidden);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j" && selected) {
        event.preventDefault();
        setTerminal((visible) => !visible);
      }
      if (event.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [navigate, selected, project?.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    localStorage.setItem("crabase-sidebar-hidden", String(sidebarHidden));
  }, [sidebarHidden]);
  useEffect(() => localStorage.setItem("crabase-details-open", String(details)), [details]);
  useEffect(() => localStorage.setItem("crabase-code-open", String(code)), [code]);
  async function act(action: string, body: unknown) {
    setError("");
    try {
      await request(action, body);
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    }
  }
  async function send(options: SendOptions) {
    const body = draftRef.current.trim();
    if ((!body && !options.attachments?.length) || sending.current) return false;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      let id = selected || draftChat.current;
      if (!id) {
        const result = await request<{ id: string }>("create", {
          project_id: projectId || null,
          title: body.slice(0, 90) || 'Attachments',
        });
        id = result.id;
        draftChat.current = id;
      }
      await request("message", {
        ...options,
        chat_id: id,
        body,
        user_id: data.users.find((user) => user.name === preferences.name)?.id,
      });
      if (draftRef.current.trim() === body) clearDraft();
      if (!selected) navigate(chatPath(id));
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function archive(target = chat) {
    if (!target) return;
    if (await act("archive", { chat_id: target.id, archived: !target.archived }))
      setToast(target.archived ? "Chat restored" : "Chat archived");
  }
  async function manageProject(target: Project, action: "projectArchive" | "projectDelete") {
    if (action === "projectDelete" && !window.confirm(
      target.parent_id
        ? `Delete worktree "${target.name}" and all its chats? The local folder will be permanently removed, including ignored files such as .env, databases and dependencies. The Git branch will be kept.`
        : `Delete "${target.name}" and all its chats? Delete its worktrees first. The original project folder will be kept.`,
    )) return;
    setError('');
    try {
      const result = await request<{ requires_confirmation?: boolean }>(action, { project_id: target.id, archived: !target.archived });
      if (result.requires_confirmation) {
        if (!window.confirm(`Worktree "${target.name}" has uncommitted or untracked files. Delete anyway? Everything in ${target.path} will be permanently removed. Uncommitted work cannot be recovered from Git. The branch will be kept.`)) return;
        await request(action, { project_id: target.id, force: true });
      }
      setToast(action === "projectDelete" ? "Project deleted" : target.archived ? "Project restored" : "Project archived");
    } catch (error) { setError((error as Error).message); }
  }
  useEffect(() => {
    // A create response can arrive before its snapshot patch. Only clear a project that was actually removed.
    if (loaded && projectId && previousProjects.current.some((item) => item.id === projectId) && !data.projects.some((item) => item.id === projectId)) setProjectId("");
    previousProjects.current = data.projects;
    if (loaded && selected && !data.chats.some((item) => item.id === selected)) newChat();
  }, [loaded, data.projects, data.chats, selected, projectId]);
  const composer = (
    <Composer
      {...{
        chat,
        project,
        data,
        live,
        loaded,
        draftRef,
        draftVersion,
        busy,
        error,
        request,
        send,
      }}
      dismissError={() => setError("")}
      cancel={() => void act("cancel", { chat_id: selected })}
      restore={() => void archive()}
    />
  );
  if (route.page === "settings" || user.avatar_required) return <main className="settings-shell">
    <SettingsPage request={request} projects={data.projects} loaded={loaded} back={() => navigate('/')} {...preferences} />
  </main>;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to conversation
      </a>
      <Sidebar
        admin={!!user.admin}
        projects={data.projects}
        pins={data.pins}
        pinProject={(target) => void act("projectPin", { project_id: target.id, pinned: !data.pins.includes(target.id) })}
        chats={data.chats}
        selected={selected}
        activeProjectId={project?.id}
        name={preferences.name}
        avatars={preferences.avatars}
        visible={sidebar}
        hidden={sidebarHidden}
        close={() => {
          setSidebar(false);
          if (window.innerWidth > 760) setSidebarHidden(true);
        }}
        open={open}
        newChat={newChat}
        showDialog={(value) => {
          if (value === "settings") { navigate('/settings'); setSidebar(false); setDialog(''); }
          else setDialog(value);
        }}
        archive={(target) => void archive(target)}
        manageProject={(target, action) => void manageProject(target, action)}
        createWorktree={setWorktreeProject}
      />
      <main className="main-panel" id="main-content" tabIndex={-1}>
        <Header
          {...{ chat, project, sidebarHidden }}
          showSidebar={() => {
            setSidebar(true);
            setSidebarHidden(false);
          }}
          toggleDetails={() => setDetails(!details)}
          detailsOpen={details}
          toggleCode={() => setCode((visible) => !visible)}
          codeOpen={code}
          toggleTerminal={() => setTerminal((visible) => !visible)}
          terminalOpen={terminal}
          copy={() =>
            void navigator.clipboard
              .writeText(location.href)
              .then(() => setToast("Chat link copied"))
              .catch(() =>
                setError("Unable to copy. Use the address in your browser."),
              )
          }
        />
        <div className="content-layout">
          <div className="main-content">
            {route.page === "missing" ? (
              <section className="empty-state">
                <h1>Page not found</h1>
                <button className="button secondary" onClick={() => newChat()}>
                  New chat
                </button>
              </section>
            ) : route.page === "new" ? (
              <NewChatPage hasProject={!!project}>{composer}</NewChatPage>
            ) : (
              <ChatPage
                {...{ chat, messages, approvals, loaded }}
                agentName={data.agentName}
                avatars={preferences.avatars}
                decide={(id, decision) =>
                  void act("approval", {
                    chat_id: selected,
                    approval_id: id,
                    decision,
                  })
                }
              >
                {composer}
              </ChatPage>
            )}
          </div>
        </div>
        {selected && loaded && (
          <TerminalPanel
            sessions={workspace.terminals}
            request={request}
            close={() => setTerminal(false)}
            fail={setError}
            theme={preferences.theme}
            open={terminal}
          />
        )}
      </main>
      {project && <CodePanel project={project} request={request} theme={preferences.theme}
        fileSearch={fileSearch} closeFileSearch={() => setFileSearch(false)}
        open={code} close={() => { setCode(false); setFileSearch(false); }} />}
      <DetailsPanel
        artifacts={workspace.artifacts}
        messages={messages}
        project={project}
        chatSelected={!!selected}
        loaded={loaded}
        open={details}
        close={() => setDetails(false)}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {dialog === "search" && (
        <SearchDialog
          chats={data.chats}
          avatars={preferences.avatars}
          open={open}
          close={() => setDialog("")}
        />
      )}
      {dialog === "project" && !!user.admin && (
        <ProjectDialog
          request={request}
          added={(id) => {
            newChat(id);
            setToast("Project opened");
          }}
          close={() => setDialog("")}
        />
      )}
      {worktreeProject && !!user.admin && <WorktreeDialog project={worktreeProject} request={request}
        close={() => setWorktreeProject(null)} added={(id) => { setWorktreeProject(null); newChat(id); setToast('Worktree created'); }} />}
    </div>
  );
}
