import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import readline from "node:readline";
import test from "node:test";

test("terminal host opens an interactive PTY and streams output", async () => {
  const host = spawn(process.execPath, ["server/bin/terminal-host.mjs"], { stdio: ["pipe", "pipe", "pipe"] });
  const packets = [];
  readline.createInterface({ input: host.stdout }).on("line", (line) => packets.push(JSON.parse(line)));
  host.stdin.write(`${JSON.stringify({ action: "open", id: "test", cwd: process.cwd(), cols: 80, rows: 24 })}\n`);
  host.stdin.write(`${JSON.stringify({ action: "input", id: "test", data: "printf '__CRABASE_PTY_OK__\\n'; exit\n" })}\n`);
  await new Promise((resolve, reject) => {
    let check;
    const timeout = setTimeout(() => {
      clearInterval(check);
      reject(new Error("PTY output timed out"));
    }, 5000);
    check = setInterval(() => {
      if (!packets.some((packet) => packet.event === "exit")) return;
      clearInterval(check);
      clearTimeout(timeout);
      resolve();
    }, 20);
  }).finally(() => host.kill());
  assert.match(packets.filter((packet) => packet.event === "output").map((packet) => packet.data).join(""), /__CRABASE_PTY_OK__/);
});
