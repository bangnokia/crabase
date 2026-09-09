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

test("worktree activity updates its parent project and worktrees sort by their own chats", () => {
  const all = [...projects, {id:'w1',parent_id:'a',name:'feature/login',created_order:3}, {id:'w2',parent_id:'a',name:'feature/billing',created_order:4}];
  const activity = [...chats, {project_id:'w1',updated_at:'2026-09-10T01:00:00Z'}, {project_id:'w2',updated_at:'2026-09-09T03:00:00Z'}];
  assert.deepEqual(sortProjects(all, activity, 'updated').filter(p=>!p.parent_id).map(p=>p.id), ['a','b']);
  assert.deepEqual(sortProjects(all.filter(p=>p.parent_id), activity, 'updated').map(p=>p.id), ['w1','w2']);
});

test("project menus stay inside narrow viewports and flip above near the bottom", async () => {
  const { menuPosition } = await import("../src/lib/layout.ts");
  assert.deepEqual(menuPosition({ left: 140, right: 164, top: 40, bottom: 64 }, { width: 184, height: 100 }, { width: 390, height: 800 }), { left: 8, top: 68 });
  assert.deepEqual(menuPosition({ left: 370, right: 394, top: 750, bottom: 774 }, { width: 184, height: 100 }, { width: 390, height: 800 }), { left: 198, top: 646 });
});
