import { useMemo } from "react";
import type { FileContents, FileOptions } from "@pierre/diffs";
import { Editor, type EditorFactory } from "@pierre/diffs/edit";
import { EditProvider, File } from "@pierre/diffs/react";

const createEditor: EditorFactory<undefined, undefined> = (type, options, key) =>
  new Editor(type, options, key);

export default function WorkspaceEditor({
  path,
  value,
  theme,
  change,
  save,
}: {
  path: string;
  value: string;
  theme: string;
  change: (value: string) => void;
  save: () => void;
}) {
  const file = useMemo<FileContents>(() => ({ name: path, contents: value }), [path]);
  const options = useMemo<FileOptions<undefined, undefined>>(() => ({
    disableFileHeader: true,
    unsafeCSS: `
      :host { --diffs-bg: var(--paper); display: block; height: 100%; }
      pre { --diffs-bg: var(--paper); height: 100%; }
      [data-code] { height: 100%; overflow: auto; align-content: start; }
      [data-code]::-webkit-scrollbar { width: 6px; }
    `,
    overflow: "scroll",
    theme: theme === "dark" ? "pierre-dark" : "pierre-light",
    themeType: theme === "dark" ? "dark" : "light",
  }), [theme]);

  return <div className="workspace-editor" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) save();
  }}>
    <EditProvider createEditor={createEditor}>
      <File
        file={file}
        options={options}
        edit
        disableWorkerPool
        onEditChange={(event) => {
          change(event.file.contents);
        }}
        onEditComplete={() => "reject"}
      />
    </EditProvider>
  </div>;
}
