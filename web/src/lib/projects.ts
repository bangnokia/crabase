import type { Chat, Project } from "../types";

export type ProjectSort = "updated" | "name" | "created";

export function sortProjects(
  projects: Project[],
  chats: Chat[],
  sort: ProjectSort,
) {
  const updated = new Map<string, string>();
  const parents = new Map(projects.map((project) => [project.id, project.parent_id]));
  for (const chat of chats)
    if (
      chat.project_id &&
      chat.updated_at > (updated.get(chat.project_id) || "")
    )
      updated.set(chat.project_id, chat.updated_at);
  for (const [id, date] of [...updated]) {
    const parent = parents.get(id);
    if (parent && date > (updated.get(parent) || '')) updated.set(parent, date);
  }

  return [...projects].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "updated")
      return (updated.get(b.id) || "").localeCompare(updated.get(a.id) || "") || b.created_order - a.created_order;
    return b.created_order - a.created_order;
  });
}
