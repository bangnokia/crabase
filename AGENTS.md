# Crabase agent instructions

Crabase is a local shared workspace: React/Vite frontend, PHP Webman/Workerman backend, SQLite, and a persistent `codex app-server` worker.

## Commands

- `npm run build` — typecheck and production frontend build.
- `npm test` — model/effort and WebSocket integration tests.
- `php server/start.php start` — run HTTP on `127.0.0.1:8787` and WebSocket on `127.0.0.1:8788`.
- `php server/start.php stop` — stop the server.

## Rules

- Read `design.md` for UI changes. Keep shared tokens in `web/src/styles/tokens.css` and components/pages separate from WebSocket and routing hooks.

- Keep browser workspace traffic on the existing WebSocket protocol (`{id, action, data}` and `patch` events); do not reintroduce polling or GET/POST refresh loops.
- Keep SQLite writes prepared, short, and compatible with WAL mode and foreign keys.
- Validate untrusted paths, message text, model names, reasoning levels, origins, and command inputs at the backend boundary.
- The Codex worker is persistent and owns the single shared agent queue. Do not spawn a new Codex process per message.
- Agent display name is configurable through `server/config/crabase.php` / `CRABASE_AGENT_NAME`; default is `Crab`.
- Projects are optional existing readable folders. Standalone chats must remain project-less.
- Do not expose loopback listeners publicly. Real auth, project permissions, and worktree isolation are not implemented.
- Run `npm run build` and `npm test` after changes. Keep the implementation minimal and update `handoff.md` for architectural changes.
