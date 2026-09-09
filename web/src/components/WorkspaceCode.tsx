import { useMemo } from "react";
import { PatchDiff } from "@pierre/diffs/react";

export default function WorkspaceCode({
  diff,
  theme,
  diffStyle,
}: {
  diff?: { path: string; patch: string };
  theme: string;
  diffStyle: "unified" | "split";
}) {
  const options = useMemo(
    () => ({
      disableFileHeader: true,
      unsafeCSS: ':host { --diffs-bg: var(--paper); } pre { --diffs-bg: var(--paper); }',
      overflow: "scroll" as const,
      theme: theme === "dark" ? "pierre-dark" as const : "pierre-light" as const,
      themeType: theme === "dark" ? "dark" as const : "light" as const,
    }),
    [theme],
  );
  return diff ? (
    <PatchDiff patch={diff.patch} options={{ ...options, diffStyle }} disableWorkerPool />
  ) : null;
}
