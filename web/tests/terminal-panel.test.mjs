import test from "node:test";
import assert from "node:assert/strict";
import { terminalPanelAction } from "../src/lib/terminal-panel.ts";

test("opening an empty terminal dock creates once; closing the last session hides it", () => {
  assert.equal(terminalPanelAction({ open: false, count: 0 }, { open: true, count: 0 }), "create");
  assert.equal(terminalPanelAction({ open: true, count: 0 }, { open: true, count: 0 }), null);
  assert.equal(terminalPanelAction({ open: true, count: 1 }, { open: true, count: 0 }), "hide");
  assert.equal(terminalPanelAction({ open: true, count: 2 }, { open: true, count: 1 }), null);
  assert.equal(terminalPanelAction({ open: false, count: 1 }, { open: true, count: 1 }), null);
  assert.equal(terminalPanelAction({ open: false, count: 1 }, { open: false, count: 0 }), null);
  assert.equal(terminalPanelAction({ open: false, count: 0 }, { open: true, count: 0 }), "create");
});
