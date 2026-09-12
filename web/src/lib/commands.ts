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
