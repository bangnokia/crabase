import { useEffect, useRef } from "react";
import type { FitAddon, ITheme, Terminal } from "ghostty-web";
import type { Request, TerminalSession } from "../types";

let ghostty: Promise<typeof import("ghostty-web")> | undefined;
const ready = () => ghostty ??= import("ghostty-web").then(async (library) => {
  await library.init();
  return library;
});
const terminalTheme = (): ITheme => {
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string) => styles.getPropertyValue(name).trim();
  const theme = {
    background: color("--terminal-background"),
    foreground: color("--text"),
    cursor: color("--text"),
    selectionBackground: color("--terminal-selection"),
    black: color("--terminal-black"),
    red: color("--danger"),
    green: color("--focus"),
    yellow: color("--terminal-yellow"),
    blue: color("--terminal-blue"),
    magenta: color("--terminal-magenta"),
    cyan: color("--terminal-cyan"),
    white: color("--subtle"),
    brightBlack: color("--muted"),
    brightWhite: color("--text"),
  };
  return { ...theme, brightRed: theme.red, brightGreen: theme.green, brightYellow: theme.yellow, brightBlue: theme.blue, brightMagenta: theme.magenta, brightCyan: theme.cyan };
};

export function TerminalPanel({
  terminalId,
  sessions,
  request,
  fail,
  theme,
  open,
}: {
  terminalId: string;
  sessions: TerminalSession[];
  request: Request;
  fail: (message: string) => void;
  theme: string;
  open: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | undefined>(undefined);
  const renderedOutput = useRef("");
  const current = sessions.find((session) => session.id === terminalId);
  const latest = useRef<TerminalSession | undefined>(current);
  latest.current = current;

  useEffect(() => {
    if (!open || !current || !host.current) return;
    let disposed = false;
    let terminal: Terminal | undefined;
    let fit: FitAddon | undefined;
    void ready().then((library) => {
      if (disposed || !host.current) return;
      const styles = getComputedStyle(document.documentElement);
      terminal = new library.Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: styles.getPropertyValue("--font-editor"),
        scrollback: 5000,
        theme: terminalTheme(),
      });
      fit = new library.FitAddon();
      terminal.loadAddon(fit);
      terminal.open(host.current);
      const output = latest.current?.id === current.id ? latest.current.output : current.output;
      if (output) terminal.write(output);
      terminal.onData((input) => void request("terminalInput", { terminal_id: current.id, input }).catch((error) => fail(error.message)));
      terminal.onResize(({ cols, rows }) => void request("terminalResize", { terminal_id: current.id, cols, rows }).catch(() => {}));
      fit.observeResize();
      fit.fit();
      terminalRef.current = terminal;
      renderedOutput.current = output;
      terminal.focus();
    }).catch((error) => fail(error.message));
    return () => {
      disposed = true;
      fit?.dispose();
      terminal?.dispose();
      if (terminalRef.current === terminal) terminalRef.current = undefined;
    };
  }, [open, current?.id, theme]);

  useEffect(() => {
    if (!current || !current.output || !host.current) return;
    const terminal = terminalRef.current;
    if (!terminal) return;
    if (current.output.startsWith(renderedOutput.current)) {
      terminal.write(current.output.slice(renderedOutput.current.length));
    } else {
      terminal.reset();
      terminal.write(current.output);
    }
    renderedOutput.current = current.output;
  }, [current?.output]);

  return (
    <section
      className={`terminal-panel ${open ? "open" : ""} terminal-embedded`}
      aria-label="Terminal"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="terminal-screen" ref={host}>
        {!current && <p className="terminal-empty" role="status">Opening terminal…</p>}
      </div>
    </section>
  );
}
