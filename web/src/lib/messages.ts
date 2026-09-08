import type { Message } from "../types";
export function applyMessagePatch(
  previous: Message[],
  updates: Message[] = [],
  appends: { id: number; delta: string }[] = [],
) {
  const items = new Map(previous.map((message) => [message.id, message]));
  for (const message of updates) items.set(message.id, message);
  for (const append of appends) {
    const message = items.get(append.id);
    if (message)
      items.set(append.id, { ...message, body: message.body + append.delta });
  }
  return [...items.values()].sort((a, b) => a.id - b.id);
}
