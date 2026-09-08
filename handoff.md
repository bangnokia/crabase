# Crabase handoff

## Current state

Crabase is initialized at `/Users/daudau/Code/bangnokia/crabase` as a React/Vite frontend with a PHP Webman/Workerman backend and SQLite persistence. The local server is designed for one shared machine and binds to loopback only.

The browser uses one WebSocket connection for workspace commands and live updates. The PHP WebSocket worker keeps one `codex app-server` process alive and queues agent turns sequentially. Enter and the send arrow dispatch a prompt to the agent; the separate note icon saves a note without invoking the agent. Agent responses, tool events, approvals, and streamed text deltas are pushed to subscribed browser tabs.

Projects are optional existing readable folders on the machine. Standalone chats have no project and use a private scratch directory under `server/runtime/chats/<chat-id>`. Folder projects can contain code or any other files; Git is not required.

## UI

- New project chats show a compact project bar above the composer. The `projectContext` WebSocket command reads the selected folder’s Git branch on opening; non-Git folders and detached HEADs show only the project name.

- Codex-style desktop layout with responsive mobile layout.
- Agent messages align left; people messages and notes align right.
- Agent display name defaults to `Crab`.
- Agent name can be overridden with `CRABASE_AGENT_NAME` or `server/config/crabase.php`.
- Model and reasoning selectors load from `model/list` on the persistent Codex app-server connection. Selections are stored with each queued job.
- DM Sans is bundled locally through `@fontsource-variable/dm-sans`; chat/composer text is intentionally readable.
- Dummy users: open `/?user=user1` and `/?user=user2` in separate browser tabs. The selected identity is kept in each tab’s sessionStorage.

## Main files

- `design.md` — design system, tokens, component contracts, and review criteria.
- `web/src/main.tsx` — React entry point only.
- `web/src/App.tsx` — app composition, navigation actions, and mutation coordination.
- `web/src/pages/` — new-chat and conversation pages.
- `web/src/components/` — sidebar, header, composer, avatars, dialogs, and workspace details.
- `web/src/hooks/useWorkspace.ts` — persistent browser WebSocket, acknowledgments, reconnect, subscription state.
- `web/src/hooks/useRoute.ts` / `lib/routes.ts` — native History API routes for `/` and `/chat/:id`.
- `web/src/hooks/usePreferences.ts` — tab identity, theme, and per-user avatar preferences.
- `web/src/styles/tokens.css` — theme, typography, spacing, and geometry tokens.
- `web/tests/frontend.test.mjs` — route, streaming patch, and avatar validation checks (Node 22.12+).
- `web/src/style.css` — complete theme/layout styles.
- `server/app/process/Codex.php` — persistent Codex process, queue, JSONL bridge, WebSocket subscriptions and patches.
- `server/app/service/Store.php` — SQLite schema, migrations, validation helpers, snapshots.
- `server/app/service/Actions.php` — validated project/chat/message/archive/cancel/approval commands.
- `server/config/process.php` — Webman HTTP worker and Codex WebSocket worker.
- `server/config/crabase.php` — agent display-name configuration.
- `server/tests/smoke.py` — WebSocket integration test with two clients.
- `server/tests/models.php` — model/effort validation test.

## Run

```sh
cd /Users/daudau/Code/bangnokia/crabase
npm install
composer install --working-dir=server
npm run build
php server/start.php start
```

Open `http://127.0.0.1:8787`. Stop with `php server/start.php stop`; use `start -d` for daemon mode. For frontend development, keep PHP running and use `npm run dev`, then open `http://127.0.0.1:5173`.

If PHP cannot find Codex, set `CODEX_BIN` to the absolute executable path. Run `codex login` separately when authentication is needed.

## Frontend maintenance

Read `design.md` before changing UI. Shared components use explicit typed props; the app owns mutations and the WebSocket hook owns transport. No router, state-management, or UI-kit dependency was added. Hidden recent-chat/suggestion/about/activity-page code and its styles were removed. Archive/restore remains available through the header and sidebar archive list.

Snapshot `chats[].participants` is now a JSON array of distinct human message/note authors. Guide/agent authors and invented default users are excluded. Avatar image URLs are keyed by author in localStorage and synchronized across tabs of the same browser; they are not server-side user profiles or account authentication.

The backend worker is not hot-reloadable. Restart PHP after backend changes when no turn is active, then verify the WebSocket command against the live worker.

## Verification

```sh
npm run build
npm test
```

Current tests pass:

- model/reasoning validation, defaults, queued selections, and rejection before persistence;
- WebSocket commands and origin rejection;
- two-client live updates;
- text-only delta patches;
- reconnect persistence;
- standalone chats and folder-backed threads;
- archive/restore behavior.

A real browser check has also completed a model-selected Codex request through PHP and verified the streamed response.

## Important boundaries

This is a local foundation, not a network-ready team deployment. There is no real authentication, membership/authorization, or secure remote exposure. Dummy users are labels only. One Codex turn runs at a time to avoid concurrent edits. Separate Git worktrees and parallel agent workers are not implemented. Advanced interactive app-server requests are not supported yet.

Do not expose the loopback listeners publicly until authentication, authorization, TLS, origin policy, and workspace isolation are implemented.

## Suggested next work

1. Add real user authentication and project membership checks.
2. Add explicit shared-chat participants and permissions for agent dispatch/approvals.
3. Add per-task Git worktrees and isolated Codex workers for parallel coding.
4. Add browser E2E coverage for approval, cancellation, reconnect, and model selection.
5. Add a production reverse proxy and deployment configuration only after the security boundary is designed.

Keep changes small, reuse the existing WebSocket path, and update this handoff when behavior or commands change.
