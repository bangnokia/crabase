import readline from "node:readline";
import process from "node:process";
import pty from "@lydell/node-pty";

const terminals = new Map();
const emit = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const shell = process.platform === "win32"
  ? process.env.COMSPEC || "cmd.exe"
  : process.env.SHELL || "/bin/sh";

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
    if (message.action === "open") {
      const terminal = pty.spawn(shell, [], {
        name: "xterm-256color",
        cwd: message.cwd,
        cols: message.cols,
        rows: message.rows,
        env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
      });
      terminals.set(message.id, terminal);
      terminal.onData((data) => emit({ event: "output", id: message.id, data }));
      terminal.onExit(({ exitCode }) => {
        terminals.delete(message.id);
        emit({ event: "exit", id: message.id, exitCode });
      });
      emit({ event: "opened", id: message.id });
      return;
    }
    const terminal = terminals.get(message.id);
    if (!terminal) return;
    if (message.action === "input") terminal.write(message.data);
    if (message.action === "resize") terminal.resize(message.cols, message.rows);
    if (message.action === "close") terminal.kill();
  } catch (error) {
    emit({ event: "error", id: message?.id || null, message: error instanceof Error ? error.message : "Terminal host error" });
  }
});

process.on("SIGTERM", () => {
  for (const terminal of terminals.values()) terminal.kill();
  process.exit(0);
});
