import { Download, File, X } from "lucide-react";
import type { Artifact } from "../types";
import { IconButton } from "./ui";
export function DetailsPanel({
  artifacts,
  chatSelected,
  loaded,
  close,
}: {
  artifacts: Artifact[];
  chatSelected: boolean;
  loaded: boolean;
  close: () => void;
}) {
  return (
    <aside className="details-panel" aria-label="Artifacts">
      <div className="details-heading">
        <h2>Artifacts</h2>
        <IconButton label="Close artifacts" onClick={close}>
          <X size={17} />
        </IconButton>
      </div>
      {chatSelected && (
        <div>
          {!loaded ? (
            <p className="muted">Loading artifacts…</p>
          ) : !artifacts.length ? (
            <p className="muted">No artifacts yet.</p>
          ) : (
            <ul className="artifact-list">
              {artifacts.map((file) => (
                <li key={file.url}>
                  {/^image\/(png|jpeg|gif|webp|avif)$/.test(file.mime) ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Preview ${file.name}`}
                    >
                      <img src={file.url} alt="" loading="lazy" />
                    </a>
                  ) : (
                    <File size={24} aria-hidden="true" />
                  )}
                  <a
                    href={`${file.url}?download=1`}
                    className="artifact-download"
                    title={file.name}
                  >
                    <span>
                      <strong>{file.name.replace(/^[a-f0-9]{12}-/, "")}</strong>
                      <small>
                        {file.name.split(".").pop()?.toUpperCase()} ·{" "}
                        {file.size < 1024
                          ? `${file.size} B`
                          : file.size < 1048576
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / 1048576).toFixed(1)} MB`}
                      </small>
                    </span>
                    <Download size={16} aria-label="Download" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
