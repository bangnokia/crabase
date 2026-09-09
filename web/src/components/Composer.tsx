import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowUp,
  Folder,
  GitBranch,
  Loader2,
  Paperclip,
  Square,
  StickyNote,
} from "lucide-react";
import type { Chat, Project, Request, Snapshot } from "../types";
import { IconButton, ErrorNotice } from "./ui";
import { AttachmentList } from './AttachmentList';
import { ModelPicker } from './ModelPicker';
import { reasoningLevels } from '../lib/models';
import { useAttachments } from '../hooks/useAttachments';
export type SendOptions = {
  mode: "agent" | "note";
  model?: string;
  effort?: string | null;
  attachments?: string[];
};
export function Composer({
  chat,
  project,
  data,
  live,
  loaded,
  draftRef,
  draftVersion,
  busy,
  error,
  dismissError,
  request,
  send,
  cancel,
  restore,
}: {
  chat?: Chat;
  project?: Project;
  data: Snapshot;
  live: boolean;
  loaded: boolean;
  draftRef: RefObject<string>;
  draftVersion: number;
  busy: boolean;
  error: string;
  dismissError: () => void;
  request: Request;
  send: (options: SendOptions) => Promise<boolean>;
  cancel: () => void;
  restore: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const attachments = useAttachments(request, draftVersion, chat?.id || project?.id || '');
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(() => draftRef.current);
  useEffect(() => setDraft(draftRef.current), [draftRef, draftVersion]);
  const [model, setModel] = useState(
    () => sessionStorage.getItem("crabase.model") || "",
  );
  const [effort, setEffort] = useState(
    () => sessionStorage.getItem("crabase.effort") || "",
  );
  const [context, setContext] = useState<{ branch: string | null; path: string; worktree: string | null; detached: boolean } | null>(null);
  const [branchError, setBranchError] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [modelError, setModelError] = useState("");
  const chosen =
    data.models.find((item) => item.model === model) ||
    data.models.find((item) => item.isDefault) ||
    data.models[0];
  const levels = reasoningLevels(chosen);
  const reasoning = levels.some((item) => item.reasoningEffort === effort)
    ? effort
    : levels.find(item => item.reasoningEffort === chosen?.defaultReasoningEffort)?.reasoningEffort || levels[0]?.reasoningEffort || "";
  const disabled = (!draft.trim() && !attachments.files.length) || !attachments.ready || busy || !loaded || !live;
  useEffect(() => {
    if (chosen) sessionStorage.setItem("crabase.model", chosen.model);
    sessionStorage.setItem("crabase.effort", reasoning);
  }, [chosen?.model, reasoning]);
  useEffect(() => {
    if (CSS.supports("field-sizing", "content")) return;
    const el = textarea.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(180, Math.max(52, el.scrollHeight))}px`;
    }
  }, [draft]);
  useEffect(() => {
    setContext(null);
  }, [project?.id, project?.path, live]);
  useEffect(() => {
    setBranchError(false);
    if (!project || !live) return;
    let stale = false;
    request<NonNullable<typeof context>>("projectContext", {
      project_id: project.id,
    })
      .then((result) => {
        if (!stale) setContext(result);
      })
      .catch(() => {
        if (!stale) setBranchError(true);
      });
    return () => {
      stale = true;
    };
  }, [chat?.id, chat?.status, project?.id, project?.path, live, request, contextVersion]);
  useEffect(() => {
    const refresh = () => setContextVersion(version => version + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  function submit(mode: "agent" | "note") {
    if (disabled || (mode === "agent" && !chosen)) return;
    void send(
      mode === "note"
        ? { mode, attachments: attachments.ids() }
        : { mode, model: chosen.model, effort: reasoning || null, attachments: attachments.ids() },
    ).then((sent) => { if (sent) attachments.clear(); textarea.current?.focus(); });
  }
  return (
    <div className={`composer-wrap ${chat ? "in-chat" : ""}`}>
      <ErrorNotice message={error} dismiss={dismissError} />
      {!live && (
        <p className="connection-notice" role="status">
          Reconnecting… Your draft is kept here.
        </p>
      )}
      {!chat && project && (
        <div className="composer-project-bar">
          <span>
            <Folder size={15} />
            {project.name}
          </span>
        </div>
      )}
      {chat?.archived ? (
        <div className="archived-notice">
          <span>This chat is archived.</span>
          <button className="button secondary" onClick={restore}>
            Restore chat
          </button>
        </div>
      ) : (
        <div className={`composer-box ${dragging ? 'attachment-dragging' : ''}`}
          onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
          onDrop={event => { event.preventDefault(); setDragging(false); if (!busy && live) attachments.add(Array.from(event.dataTransfer.files)); }}
          onPaste={event => { if (event.clipboardData.files.length && !busy && live) { event.preventDefault(); attachments.add(Array.from(event.clipboardData.files)); } }}>
          <AttachmentList files={attachments.files} remove={attachments.remove} retry={attachments.retry} disabled={busy || !live} />
          <ErrorNotice message={attachments.error} />
          <textarea
            ref={textarea}
            aria-label={`Message ${data.agentName}`}
            placeholder={`Message ${data.agentName}…`}
            rows={2}
            value={draft}
            maxLength={20000}
            onChange={(event) => {
              draftRef.current = event.target.value;
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit("agent");
              }
            }}
          />
          <div className="composer-controls">
            <div className="model-controls">
              <input ref={picker} type="file" multiple hidden onChange={event => { attachments.add(Array.from(event.target.files || [])); event.target.value = ''; }} />
              <IconButton label="Attach files" disabled={busy || !live || attachments.files.length >= 10} onClick={() => picker.current?.click()}><Paperclip size={17} /></IconButton>
              <ModelPicker models={data.models} chosen={chosen} reasoning={reasoning}
                unavailable={data.runtime === 'error'}
                selectModel={model => { setModel(model); setEffort(''); }}
                selectReasoning={setEffort} />
              {context?.branch && (
                <span className="composer-branch" tabIndex={0}
                  title={`${context.detached ? 'Detached HEAD: ' : 'Branch: '}${context.branch}\n${context.worktree ? `Worktree: ${context.worktree}\n` : ''}${context.path}`}
                  onMouseEnter={() => setContextVersion(version => version + 1)}
                  onFocus={() => setContextVersion(version => version + 1)}>
                  <GitBranch size={14} aria-hidden="true" />
                  <span className="truncate">{context.detached ? 'HEAD · ' : ''}{context.branch}</span>
                </span>
              )}
              {project && branchError && <button className="text-button" onClick={() => setContextVersion(version => version + 1)}>Retry branch lookup</button>}
              {data.runtime === "error" && (
                <button
                  className="text-button"
                  onClick={() => {
                    setModelError("");
                    void request("models").catch((error: Error) =>
                      setModelError(error.message),
                    );
                  }}
                >
                  Retry models
                </button>
              )}
            </div>
            <div className="send-controls">
              <IconButton
                label="Send note"
                disabled={disabled}
                onClick={() => submit("note")}
              >
                <StickyNote size={18} />
              </IconButton>
              {chat && chat.status !== "idle" ? (
                <IconButton
                  className="send-button"
                  label="Stop agent and queued requests"
                  disabled={!live}
                  onClick={cancel}
                >
                  <Square size={16} />
                </IconButton>
              ) : (
                <IconButton
                  className="send-button"
                  label={`Send to ${data.agentName}`}
                  disabled={disabled || !chosen}
                  onClick={() => submit("agent")}
                >
                  {busy ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <ArrowUp size={19} />
                  )}
                </IconButton>
              )}
            </div>
          </div>
          <ErrorNotice message={modelError} />
        </div>
      )}
    </div>
  );
}
