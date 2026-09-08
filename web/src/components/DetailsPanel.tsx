import { Folder, X } from "lucide-react";
import type { Project, Snapshot } from "../types";
import { time } from "../lib/format";
import { IconButton } from "./ui";
export function DetailsPanel({
  project,
  data,
  close,
  open,
}: {
  project?: Project;
  data: Snapshot;
  close: () => void;
  open: (id: string) => void;
}) {
  return (
    <aside className="details-panel" aria-label="Workspace details">
      <div className="details-heading">
        <h2>Workspace</h2>
        <IconButton label="Close workspace details" onClick={close}>
          <X size={17} />
        </IconButton>
      </div>
      {project && (
        <div className="project-detail">
          <Folder size={20} />
          <h3>{project.name}</h3>
          <code>{project.path}</code>
        </div>
      )}
      <div className="detail-state">
        <span>{data.agentName}</span>
        <span>{data.runtime}</span>
      </div>
      <h3>Recent activity</h3>
      <div className="activity-list">
        {data.events.slice(0, 12).map((event) => (
          <button
            key={event.id}
            disabled={!event.chat_id}
            onClick={() => open(event.chat_id)}
          >
            <span>
              {event.label
                .replace(/^Codex turn /, `${data.agentName} turn `)
                .replace(/ asked Codex$/, ` asked ${data.agentName}`)}
            </span>
            <time>{time(event.created_at)}</time>
          </button>
        ))}
      </div>
      {!data.events.length && <p className="muted">No activity yet.</p>}
    </aside>
  );
}
