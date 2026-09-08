import test from "node:test";
import assert from "node:assert/strict";
import { sortProjects } from "../src/lib/projects.ts";

const projects = [
  { id: "b", name: "Beta", path: "/b", created_order: 1 },
  { id: "a", name: "Alpha", path: "/a", created_order: 2 },
];
const chats = [
  { project_id: "b", updated_at: "2026-09-09T02:00:00Z" },
  { project_id: "a", updated_at: "2026-09-09T01:00:00Z" },
];

test("projects sort by latest chat, name, or creation order", () => {
  assert.deepEqual(sortProjects(projects, chats, "updated").map((p) => p.id), ["b", "a"]);
  assert.deepEqual(sortProjects(projects, chats, "name").map((p) => p.id), ["a", "b"]);
  assert.deepEqual(sortProjects(projects, chats, "created").map((p) => p.id), ["a", "b"]);
});
