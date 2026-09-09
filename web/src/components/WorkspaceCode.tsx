import { useMemo } from "react";
import { PatchDiff } from "@pierre/diffs/react";

export default function WorkspaceCode({
  diff,
  theme,
}: {
  diff?: { path: string; patch: string };
  theme: string;
}) {
  const options = useMemo(
    () => ({
      disableFileHeader: true,
      overflow: "scroll" as const,
      theme: theme === "dark" ? "pierre-dark" as const : "pierre-light" as const,
      themeType: theme === "dark" ? "dark" as const : "light" as const,
    }),
    [theme],
  );
  return diff ? (
    <PatchDiff patch={diff.patch} options={{ ...options, diffStyle: "unified" }} disableWorkerPool />
  ) : null;
}
