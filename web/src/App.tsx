import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useRoute } from "./hooks/useRoute";
import { useWorkspace } from "./hooks/useWorkspace";
import { usePreferences } from "./hooks/usePreferences";
import { isSidebarShortcut } from "./lib/shortcuts";
import { chatPath } from "./lib/routes";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DetailsPanel } from "./components/DetailsPanel";
import { Composer, type SendOptions } from "./components/Composer";
import {
  SearchDialog,
  ProjectDialog,
  SettingsDialog,
} from "./components/WorkspaceDialogs";
import { NewChatPage } from "./pages/NewChatPage";
import { ChatPage } from "./pages/ChatPage";
export function App() {
  const { route, navigate } = useRoute();
  const selected = route.page === "chat" ? route.id : "";
  const workspace = useWorkspace(selected);
  const { data, live, loaded, messages, approvals, error, setError, request } =
    workspace;
  const preferences = usePreferences();
  const [projectId, setProjectId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [dialog, setDialog] = useState<"" | "search" | "project" | "settings">(
    "",
  );
  const [sidebar, setSidebar] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [details, setDetails] = useState(false);
  const [toast, setToast] = useState("");
  const chat = data.chats.find((item) => item.id === selected);
  const project = data.projects.find(
    (item) => item.id === (selected ? chat?.project_id : projectId),
  );
  function open(id: string) {
    navigate(chatPath(id));
    setSidebar(false);
    setDialog("");
    setDraft("");
    setError("");
  }
  function newChat(id = "") {
    setProjectId(id);
    navigate("/");
    setSidebar(false);
    setDialog("");
    setDraft("");
    setError("");
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
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
      if (event.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [navigate]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
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
    const body = draft.trim();
    if (!body || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      let id = selected;
      if (!id) {
        const result = await request<{ id: string }>("create", {
          project_id: projectId || null,
          title: body.slice(0, 90),
        });
        id = result.id;
        navigate(chatPath(id));
      }
      await request("message", {
        ...options,
        chat_id: id,
        body,
        author: preferences.name,
      });
      if (draftRef.current.trim() === body) setDraft("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function archive() {
    if (!chat) return;
    if (await act("archive", { chat_id: chat.id, archived: !chat.archived }))
      setToast(chat.archived ? "Chat restored" : "Chat archived");
  }
  const composer = (
    <Composer
      {...{
        chat,
        project,
        data,
        live,
        loaded,
        draft,
        setDraft,
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
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to conversation
      </a>
      <Sidebar
        projects={data.projects}
        chats={data.chats}
        selected={selected}
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
        showDialog={setDialog}
      />
      <main className="main-panel" id="main-content" tabIndex={-1}>
        <Header
          {...{ chat, project, sidebarHidden }}
          showSidebar={() => {
            setSidebar(true);
            setSidebarHidden(false);
          }}
          toggleDetails={() => setDetails(!details)}
          archive={() => void archive()}
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
          {details && (
            <DetailsPanel
              {...{ project, data, open }}
              close={() => setDetails(false)}
            />
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
        <SearchDialog
          chats={data.chats}
          avatars={preferences.avatars}
          open={open}
          close={() => setDialog("")}
        />
      )}
      {dialog === "project" && (
        <ProjectDialog
          request={request}
          added={(id) => {
            newChat(id);
            setToast("Project added");
          }}
          close={() => setDialog("")}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog {...preferences} close={() => setDialog("")} />
      )}
    </div>
  );
}
