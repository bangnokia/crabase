import { lazy, Suspense } from "react";
import type { Project, Request } from "../types";
import { RightPanel } from "./RightPanel";

const ProjectWorkspacePanel = lazy(() =>
  import("./ProjectWorkspacePanel").then((module) => ({ default: module.ProjectWorkspacePanel })),
);

export function CodePanel({ project, request, theme, open, close }: {
  project: Project;
  request: Request;
  theme: string;
  open: boolean;
  close: () => void;
}) {
  return <RightPanel className="code-panel" label="Code workspace"
    {...{ open, close }} defaultWidth={760} minWidth={520} maxWidth={1200}
    storageKey="crabase-code-width" focusable>
    <Suspense fallback={<p className="workspace-message muted">Loading project tools…</p>}>
      <ProjectWorkspacePanel key={project.id} {...{ project, request, theme }} />
    </Suspense>
  </RightPanel>;
}
