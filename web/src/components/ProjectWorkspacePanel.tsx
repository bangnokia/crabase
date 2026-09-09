import { lazy, Suspense, useEffect, useState } from "react";
import { FilePlus2, Files as FilesIcon, GitCompareArrows, RefreshCw, X } from "lucide-react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import type { Project, ProjectWorkspace, Request, WorkspaceChange } from "../types";
import { IconButton } from "./ui";
const WorkspaceCode = lazy(() => import("./WorkspaceCode"));
const WorkspaceEditor = lazy(() => import("./WorkspaceEditor"));

type OpenFile = { path: string; contents: string; hash: string; draft: string };
type Diff = { path: string; patch: string };

export function ProjectWorkspacePanel({ project, request, theme }: {
  project: Project;
  request: Request;
  theme: string;
}) {
  const [workspace, setWorkspace] = useState<ProjectWorkspace>();
  const [fileRequest, setFileRequest] = useState<{ path: string; token: number }>();
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState("");
  const [selectedChange, setSelectedChange] = useState<WorkspaceChange>();
  const [diff, setDiff] = useState<Diff>();
  const [navigator, setNavigator] = useState<"files" | "changes">("files");
  const [surface, setSurface] = useState<"file" | "diff">("file");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = files.find((file) => file.path === activePath);
  const { model } = useFileTree({
    paths: [],
    density: "compact",
    icons: { set: "complete", colored: false },
    initialExpansion: 1,
    search: true,
    flattenEmptyDirectories: true,
    onSelectionChange: (paths) => openFile(paths.at(-1) || ""),
  });

  function openFile(path: string) {
    if (!path || path.endsWith("/")) return;
    setSurface("file");
    setFileRequest((current) => ({ path, token: (current?.token || 0) + 1 }));
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setWorkspace(await request<ProjectWorkspace>("projectWorkspace", { project_id: project.id }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setWorkspace(undefined);
    setFileRequest(undefined);
    setFiles([]);
    setActivePath("");
    setSelectedChange(undefined);
    setDiff(undefined);
    setNavigator("files");
    setSurface("file");
    void refresh();
  }, [project.id]);

  useEffect(() => {
    model.resetPaths(workspace?.paths || []);
    model.setGitStatus(workspace?.changes || []);
  }, [model, workspace]);

  useEffect(() => {
    if (!fileRequest) return;
    const existing = files.find((file) => file.path === fileRequest.path);
    if (existing) {
      setActivePath(existing.path);
      return;
    }
    setLoading(true);
    setError("");
    request<Omit<OpenFile, "draft">>("projectFile", {
      project_id: project.id,
      path: fileRequest.path,
    }).then((file) => {
      setFiles((current) => current.some((item) => item.path === file.path)
        ? current
        : [...current, { ...file, draft: file.contents }]);
      setActivePath(file.path);
    }).catch((error) => setError((error as Error).message))
      .finally(() => setLoading(false));
  }, [fileRequest, project.id, request]);

  useEffect(() => {
    if (!selectedChange) return;
    setDiff(undefined);
    setLoading(true);
    setError("");
    request<Diff>("projectDiff", { project_id: project.id, path: selectedChange.path })
      .then(setDiff)
      .catch((error) => setError((error as Error).message))
      .finally(() => setLoading(false));
  }, [project.id, request, selectedChange]);

  function updateFile(path: string, update: (file: OpenFile) => OpenFile) {
    setFiles((current) => current.map((file) => file.path === path ? update(file) : file));
  }

  async function save(file: OpenFile, contents = file.draft) {
    if (contents === file.contents) return;
    setLoading(true);
    setError("");
    try {
      const result = await request<{ hash: string }>("projectSave", {
        project_id: project.id,
        path: file.path,
        contents,
        hash: file.hash,
      });
      updateFile(file.path, (current) => ({
        ...current,
        contents,
        draft: current.draft === contents ? contents : current.draft,
        hash: result.hash,
      }));
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function closeFile(file: OpenFile) {
    if (file.draft !== file.contents && !window.confirm(`Discard unsaved changes to ${file.path}?`)) return;
    const remaining = files.filter((item) => item.path !== file.path);
    setFiles(remaining);
    if (activePath === file.path) setActivePath(remaining.at(-1)?.path || "");
  }

  function openChange(change: WorkspaceChange) {
    setSelectedChange(change);
    setSurface("diff");
  }

  return <section className="workspace-browser">
    {error && <p className="workspace-message error-notice" role="alert">{error}</p>}
    <div className="workspace-split">
      <aside className="workspace-navigator" aria-label={navigator === "files" ? "Project files" : "Git changes"}>
        <nav className="workspace-view-switch" aria-label="Code navigator">
          <button aria-pressed={navigator === "files"} onClick={() => setNavigator("files")}>
            <FilesIcon size={15} /> Files
          </button>
          <button aria-pressed={navigator === "changes"} onClick={() => setNavigator("changes")}>
            <GitCompareArrows size={15} /> Changes <span>{workspace?.changes.length || 0}</span>
          </button>
          <IconButton label="Refresh project" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </IconButton>
        </nav>
        {!workspace ? <p className="workspace-message muted">Loading project…</p>
          : navigator === "files" ? workspace.paths.length ? (
            <FileTree model={model} className="project-file-tree" onClick={(event) => {
              const row = event.nativeEvent.composedPath()
                .find((node) => node instanceof HTMLElement && node.dataset.itemType === "file");
              if (row instanceof HTMLElement && row.dataset.itemPath) openFile(row.dataset.itemPath);
            }} />
          ) : <p className="workspace-message muted">No files found.</p>
          : !workspace.git ? <p className="workspace-message muted">This project is not a Git repository.</p>
          : workspace.changes.length ? <ul className="workspace-changes">{workspace.changes.map((change) => (
            <li key={`${change.code}:${change.path}`}><button className={selectedChange?.path === change.path ? "selected" : ""}
              onClick={() => openChange(change)} title={change.path}>
              <span className={`change-status ${change.status}`} aria-hidden="true">{statusLabel(change.status)}</span>
              <span className="truncate">{change.path}</span>
            </button></li>
          ))}</ul> : <p className="workspace-message muted">No changes.</p>}
      </aside>
      <div className="workspace-stage">
        <div className="workspace-stage-header">
          <FileTabs files={files} active={activePath} diff={selectedChange} surface={surface}
            select={(path) => { setActivePath(path); setSurface("file"); }} close={closeFile}
            selectDiff={() => setSurface("diff")} closeDiff={() => {
              setSelectedChange(undefined);
              setDiff(undefined);
              setSurface("file");
            }} />
          {surface === "diff" && diff && <div className="workspace-stage-actions">
            <button className="button secondary workspace-action"
              disabled={selectedChange?.status === "deleted"} onClick={() => openFile(diff.path)}>Edit file</button>
          </div>}
        </div>
        {surface === "file" ? active ? <>
          <div className="workspace-code"><Suspense fallback={<p className="workspace-message muted">Loading editor…</p>}>
            <WorkspaceEditor key={`${project.id}:${active.path}`} path={active.path} value={active.draft} theme={theme}
              change={(draft) => updateFile(active.path, (file) => ({ ...file, draft }))}
              save={() => void save(active)} />
          </Suspense></div>
        </> : <div className="workspace-empty"><FilePlus2 size={20} /><span>Select a file to edit.</span></div>
        : diff ? <>
          <div className="workspace-code"><Suspense fallback={<p className="workspace-message muted">Loading diff…</p>}>
            <WorkspaceCode diff={diff} theme={theme} />
          </Suspense></div>
        </> : <div className="workspace-empty"><span>{loading ? "Loading change…" : "Select a change to review."}</span></div>}
      </div>
    </div>
  </section>;
}

function FileTabs({ files, active, diff, surface, select, close, selectDiff, closeDiff }: {
  files: OpenFile[];
  active: string;
  diff?: WorkspaceChange;
  surface: "file" | "diff";
  select: (path: string) => void;
  close: (file: OpenFile) => void;
  selectDiff: () => void;
  closeDiff: () => void;
}) {
  return <nav className="workspace-editor-tabs" aria-label="Open files">
    {files.map((file) => <div className="workspace-editor-tab" data-active={surface === "file" && file.path === active} key={file.path}>
      <button onClick={() => select(file.path)} title={file.path}>
        <span className="truncate">{file.path.split("/").pop()}</span>
        {file.draft !== file.contents && <span aria-label="Unsaved">●</span>}
      </button>
      <IconButton label={`Close ${file.path}`} onClick={() => close(file)}><X size={13} /></IconButton>
    </div>)}
    {diff && <div className="workspace-editor-tab diff" data-active={surface === "diff"}>
      <button onClick={selectDiff} title={`Review ${diff.path}`}>
        <GitCompareArrows size={13} /><span className="truncate">{diff.path.split("/").pop()}</span>
      </button>
      <IconButton label={`Close review of ${diff.path}`} onClick={closeDiff}><X size={13} /></IconButton>
    </div>}
  </nav>;
}

function statusLabel(status: WorkspaceChange["status"]) {
  return status === "modified" ? "M" : status === "deleted" ? "D" : status === "renamed" ? "R" : status === "untracked" ? "U" : "A";
}
