import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Folder,
  GitBranch,
  Loader2,
  Square,
  StickyNote,
} from "lucide-react";
import type { Chat, Project, Request, Snapshot } from "../types";
import { IconButton, ErrorNotice } from "./ui";
export type SendOptions = {
  mode: "agent" | "note";
  model?: string;
  effort?: string | null;
};
export function Composer({
  chat,
  project,
  data,
  live,
  loaded,
  draft,
  setDraft,
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
  draft: string;
  setDraft: (draft: string) => void;
  busy: boolean;
  error: string;
  dismissError: () => void;
  request: Request;
  send: (options: SendOptions) => Promise<void>;
  cancel: () => void;
  restore: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [model, setModel] = useState(
    sessionStorage.getItem("crabase.model") || "",
  );
  const [effort, setEffort] = useState(
    sessionStorage.getItem("crabase.effort") || "",
  );
  const [branch, setBranch] = useState<string | null>(null);
  const [branchError, setBranchError] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [modelError, setModelError] = useState("");
  const chosen =
    data.models.find((item) => item.model === model) ||
    data.models.find((item) => item.isDefault) ||
    data.models[0];
  const levels = chosen?.supportedReasoningEfforts || [];
  const reasoning = levels.some((item) => item.reasoningEffort === effort)
    ? effort
    : chosen?.defaultReasoningEffort || "";
  const disabled = !draft.trim() || busy || !loaded || !live;
  useEffect(() => {
    if (chosen) sessionStorage.setItem("crabase.model", chosen.model);
    sessionStorage.setItem("crabase.effort", reasoning);
  }, [chosen?.model, reasoning]);
  useEffect(() => {
    const el = textarea.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(180, Math.max(52, el.scrollHeight))}px`;
    }
  }, [draft]);
  useEffect(() => {
    setBranch(null);
    setBranchError(false);
    if (chat || !project || !live) return;
    let stale = false;
    request<{ branch: string | null }>("projectContext", {
      project_id: project.id,
    })
      .then((result) => {
        if (!stale) setBranch(result.branch);
      })
      .catch(() => {
        if (!stale) setBranchError(true);
      });
    return () => {
      stale = true;
    };
  }, [chat?.id, project?.id, project?.path, live, request, contextVersion]);
  function submit(mode: "agent" | "note") {
    if (disabled || (mode === "agent" && !chosen)) return;
    void send(
      mode === "note"
        ? { mode }
        : { mode, model: chosen.model, effort: reasoning || null },
    ).then(() => textarea.current?.focus());
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
          {branch && (
            <span>
              <GitBranch size={15} />
              {branch}
            </span>
          )}
          {branchError && (
            <button onClick={() => setContextVersion(contextVersion + 1)}>
              Retry branch lookup
            </button>
          )}
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
        <div className="composer-box">
          <textarea
            ref={textarea}
            aria-label={`Message ${data.agentName}`}
            placeholder={`Message ${data.agentName}…`}
            rows={2}
            value={draft}
            maxLength={20000}
            onChange={(event) => setDraft(event.target.value)}
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
              <select
                aria-label="Model"
                value={chosen?.model || ""}
                disabled={!data.models.length}
                onChange={(event) => {
                  setModel(event.target.value);
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
                {data.models.map((item) => (
                  <option key={item.model} value={item.model}>
                    {item.displayName}
                  </option>
                ))}
              </select>
              <select
                aria-label="Reasoning level"
                value={reasoning}
                disabled={!levels.length}
                onChange={(event) => setEffort(event.target.value)}
              >
                {!levels.length && (
                  <option value="">No reasoning levels</option>
                )}
                {levels.map((item) => (
                  <option
                    key={item.reasoningEffort}
                    value={item.reasoningEffort}
                  >
                    {item.reasoningEffort[0].toUpperCase() +
                      item.reasoningEffort.slice(1)}
                  </option>
                ))}
              </select>
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
      {!chat?.archived && (
        <div className="composer-foot">
          ↵ to send <span>·</span> ⇧ ↵ for new line
        </div>
      )}
    </div>
  );
}
