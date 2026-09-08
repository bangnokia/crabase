# Crabase handoff

## Current state

Crabase is initialized at `/Users/daudau/Code/crabase` as a React/Vite frontend with a PHP Webman/Workerman backend and SQLite persistence. The local server is designed for one shared machine and binds to loopback only.

The browser uses one WebSocket connection for workspace commands and live updates. The PHP WebSocket worker keeps one `codex app-server` process alive and queues agent turns sequentially. People can send team messages with the arrow button; the Crab icon dispatches the draft to the shared agent. Agent responses, tool events, approvals, and streamed text deltas are pushed to subscribed browser tabs.

Projects are optional existing readable folders on the machine. Standalone chats have no project and use a private scratch directory under `server/runtime/chats/<chat-id>`. Folder projects can contain code or any other files; Git is not required.

## UI

- Codex-style desktop layout with responsive mobile layout.
- Agent messages align left; people messages and notes align right.
- Agent display name defaults to `Crab`.
- Agent name can be overridden with `CRABASE_AGENT_NAME` or `server/config/crabase.php`.
- Model and reasoning selectors load from `model/list` on the persistent Codex app-server connection. Selections are stored with each queued job.
- DM Sans is bundled locally through `@fontsource-variable/dm-sans`; chat/composer text is intentionally readable.
- Dummy users: open `/?user=user1` and `/?user=user2` in separate browser tabs. The selected identity is kept in each tab’s sessionStorage.

## Main files

- `web/src/main.tsx` — React UI, WebSocket client, composer, model/reasoning controls.
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
cd /Users/daudau/Code/crabase
npm install
composer install --working-dir=server
npm run build
php server/start.php start
```

Open `http://127.0.0.1:8787`. Stop with `php server/start.php stop`; use `start -d` for daemon mode. For frontend development, keep PHP running and use `npm run dev`, then open `http://127.0.0.1:5173`.

If PHP cannot find Codex, set `CODEX_BIN` to the absolute executable path. Run `codex login` separately when authentication is needed.

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
