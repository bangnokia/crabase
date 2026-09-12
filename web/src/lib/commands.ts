export type Command = {
  id: string;
  label: string;
  keywords?: string[];
  shortcut?: string;
  run: () => void;
};

export function filterCommands(commands: Command[], query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return commands;
  return commands.filter((command) => [command.label, ...(command.keywords || [])]
    .join(" ").toLowerCase().includes(value));
}

export function fuzzyScore(text: string, query: string) {
  if (!query) return 0;
  const score = matchScore(text.toLowerCase(), query.toLowerCase());
  return Number.isFinite(score) ? score : null;
}
import { matchScore } from "./file-search";
