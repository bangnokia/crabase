import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("typing state stays inside Composer, not the workspace render tree", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const composer = readFileSync(new URL("../src/components/Composer.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /\bsetDraft\b/);
  assert.match(composer, /const \[draft, setDraft\] = useState\(\(\) => draftRef\.current\)/);
  assert.match(composer, /draftRef\.current = event\.target\.value;\s*setDraft\(event\.target\.value\)/);
  assert.match(app, /const body = draftRef\.current\.trim\(\)/);
  assert.match(app, /if \(draftRef\.current\.trim\(\) === body\) clearDraft\(\)/);
});
