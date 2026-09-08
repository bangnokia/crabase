import type { Chat, Project } from "../types";

export type ProjectSort = "updated" | "name" | "created";

export function sortProjects(
  projects: Project[],
  chats: Chat[],
  sort: ProjectSort,
) {
  const updated = new Map<string, string>();
  for (const chat of chats)
    if (
      chat.project_id &&
      chat.updated_at > (updated.get(chat.project_id) || "")
    )
      updated.set(chat.project_id, chat.updated_at);

  return [...projects].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "updated")
      return (updated.get(b.id) || "").localeCompare(updated.get(a.id) || "");
    return b.created_order - a.created_order;
  });
}
