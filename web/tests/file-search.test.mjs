import test from "node:test";
import assert from "node:assert/strict";
import { searchFiles } from "../src/lib/file-search.ts";
import { fileSearchDirection } from "../src/lib/shortcuts.ts";

test("file palette supports control navigation without taking Cmd+P or IME input", () => {
  const event = { key: "n", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, isComposing: false };
  assert.equal(fileSearchDirection(event), 1);
  assert.equal(fileSearchDirection({ ...event, key: "p" }), -1);
  assert.equal(fileSearchDirection({ ...event, key: "p", ctrlKey: false, metaKey: true }), 0);
  assert.equal(fileSearchDirection({ ...event, isComposing: true }), 0);
  assert.equal(fileSearchDirection({ ...event, shiftKey: true }), 0);
  assert.equal(fileSearchDirection({ ...event, key: "ArrowDown", ctrlKey: false }), 1);
  assert.equal(fileSearchDirection({ ...event, key: "ArrowUp", ctrlKey: false }), -1);
});

test("file search is fuzzy, case insensitive, filename-first, and excludes folders", () => {
  const paths = ["src/", "src/components/ProjectWorkspacePanel.tsx", "src/App.tsx", "App/tests/helper.ts", "README.md"];
  assert.deepEqual(searchFiles(paths, "pwp"), ["src/components/ProjectWorkspacePanel.tsx"]);
  assert.equal(searchFiles(paths, "APP")[0], "src/App.tsx");
  assert.deepEqual(searchFiles(paths, "src\\app"), ["src/App.tsx"]);
  assert.deepEqual(searchFiles(paths, "xyz"), []);
  assert.equal(searchFiles(paths, " ").length, 4);
  assert.equal(searchFiles(Array.from({ length: 80 }, (_, i) => `${i}.ts`), "").length, 50);
});
