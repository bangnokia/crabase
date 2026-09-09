import assert from "node:assert/strict";
import { test } from "node:test";
import { groupConversationMessages } from "../src/lib/messages.ts";

test("conversation timestamps belong after the full assistant/tool group", () => {
  const messages = ["user", "assistant", "tool", "agent_activity", "tool", "assistant", "note", "tool", "user", "guide"]
    .map((role, id) => ({ id, role, created_at: String(id) }));
  const groups = groupConversationMessages(messages);
  assert.deepEqual(groups.map(group => group.map(message => message.id)), [[0], [1, 2, 4, 5], [6], [7], [8], [9]]);
  assert.equal(groups[1].at(-1).created_at, "5");
  assert.deepEqual(groupConversationMessages([]), []);
});
