# Crabase agent instructions

Crabase is a local shared workspace: React/Vite frontend, PHP Webman/Workerman backend, SQLite, and a persistent `codex app-server` worker.

## Commands

- `npm run build` — typecheck and production frontend build.
- `npm test` — model/effort and WebSocket integration tests.
- `php server/start.php start` — run HTTP on `127.0.0.1:8787` and WebSocket on `127.0.0.1:8788`.
- `php server/start.php stop` — stop the server.

## Rules

- Read `design.md` for UI changes. Keep shared tokens in `web/src/styles/tokens.css` and components/pages separate from WebSocket and routing hooks.
- Default to compact padding: 12px settings/page gutters, 4px vertical / 8px horizontal list rows, 8–12px form gaps. Never stack inherited label margins with parent gaps; avoid oversized or nested padded wrappers.
- Follow DRY for real shared behavior: equivalent UI paths must use the same component and CSS contract (standalone and project chats both use `ChatLink`). Reuse or extend source-owned primitives in `web/src/components/ui.tsx` before duplicating interaction markup; do not extract speculative wrappers.

- Keep browser workspace traffic on the existing WebSocket protocol (`{id, action, data}` and `patch` events); do not reintroduce polling or GET/POST refresh loops.
- Keep SQLite writes prepared, short, and compatible with WAL mode and foreign keys.
- Validate untrusted paths, message text, model names, reasoning levels, origins, and command inputs at the backend boundary.
- The Codex worker is persistent and owns the single shared agent queue. Do not spawn a new Codex process per message.
- Agent display name is configurable through `server/config/crabase.php` / `CRABASE_AGENT_NAME`; default is `Crab`.
- Projects are optional existing readable folders. Standalone chats must remain project-less.
- Do not expose loopback listeners publicly. Email/password sessions are required on HTTP data and WebSocket boundaries; derive message identity from the session, never client user_id. Project permissions and worktree isolation are not implemented; signed-in members are trusted collaborators. Never expose password/session hashes in snapshots. Preserve the last enabled admin.
- Run `npm run build` and `npm test` after changes. Keep the implementation minimal and update `handoff.md` for architectural changes.
