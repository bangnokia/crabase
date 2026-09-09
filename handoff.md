# Crabase handoff

## Current state

Crabase is initialized at `/Users/daudau/Code/bangnokia/crabase` as a React/Vite frontend with a PHP Webman/Workerman backend and SQLite persistence. The local server is designed for one shared machine and binds to loopback only.

The browser uses one WebSocket connection for workspace commands and live updates. The PHP WebSocket worker keeps one `codex app-server` process alive and runs turns concurrently across chats, with sequential messages within each chat. Enter and the send arrow dispatch a prompt to the agent; the separate note icon saves a note without invoking the agent. Agent responses, tool events, approvals, and streamed text deltas are pushed to subscribed browser tabs.

Projects are optional existing readable folders on the machine. Standalone chats have no project and use a private scratch directory under `server/runtime/chats/<chat-id>`. Folder projects can contain code or any other files; Git is not required.

## UI

- New project chats show a compact project bar above the composer. The `projectContext` WebSocket command reads the selected folder’s Git branch on opening; non-Git folders and detached HEADs show only the project name.

- Codex-style desktop layout with responsive mobile layout.
- Agent messages align left; people messages and notes align right.
- Agent display name defaults to `Crab`.
- Agent name can be overridden with `CRABASE_AGENT_NAME` or `server/config/crabase.php`.
- Model and reasoning selectors load from `model/list` on the persistent Codex app-server connection. Selections are stored with each queued job.
- Typography uses rem tokens (1rem = 16px at the default root): navigation 0.875rem, messages/composer 1rem.
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
- `web/src/hooks/usePreferences.ts` — tab identity/theme preferences; avatars come from persistent users.
- `web/src/styles/tokens.css` — theme, typography, spacing, and geometry tokens.
- `web/tests/frontend.test.mjs` — route, streaming patch, and avatar validation checks (Node 22.12+).
- `web/src/style.css` — complete theme/layout styles.
- `server/app/process/Codex.php` — persistent Codex process, queue, JSONL bridge, WebSocket subscriptions and patches.
- `server/app/service/Store.php` — shared database connection, validation helpers, snapshots, and revision notifications.
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

Read `design.md` before changing UI. Shared components use explicit typed props; the app owns mutations and the WebSocket hook owns transport. No router, state-management, or UI-kit dependency was added. Hidden recent-chat/suggestion/about/activity-page code and its styles were removed. Archive/restore remains available through the header; archived chats remain discoverable through search.

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

## Agent permissions

Crabase explicitly starts and resumes Codex threads with `approvalPolicy=never` and `sandbox=danger-full-access` in `server/app/process/Codex.php`. This is scoped to Crabase; the global Codex config is unchanged. Organization policies and tool-specific confirmation requirements can still apply.

## Important boundaries

This is a local foundation, not a network-ready team deployment. There is no real authentication, membership/authorization, or secure remote exposure. Users have persistent profiles but are not authenticated. Up to 12 chats run concurrently by default. Separate Git worktrees are not implemented. Advanced interactive app-server requests are not supported yet.

Do not expose the loopback listeners publicly until authentication, authorization, TLS, origin policy, and workspace isolation are implemented.

## Suggested next work

1. Add real user authentication and project membership checks.
2. Add explicit shared-chat participants and permissions for agent dispatch/approvals.
3. Add per-task Git worktrees for isolated edits to the same project.
4. Add browser E2E coverage for approval, cancellation, reconnect, and model selection.
5. Add a production reverse proxy and deployment configuration only after the security boundary is designed.

Keep changes small, reuse the existing WebSocket path, and update this handoff when behavior or commands change.

## Published artifacts

User-facing output files live at `<CRABASE_WORKSPACE_ROOT>/.artifacts/<chat-id>/`; this is persistent storage, not disposable cache. Back it up with SQLite. The reserved directory cannot be added as a project. The Open folder dialog browses workspace folders over WebSocket.

Every Codex start/resume receives the chat output directory and an instruction to invoke `php server/bin/publish-artifact.php CHAT_ID ABSOLUTE_FILE_PATH` (using the absolute script path). This shell-invoked publisher registers a canonical file already in that chat directory without copying it, or copies a file from elsewhere under a unique filename, then returns JSON containing a relative `/files/<chat-id>/<filename>` URL. Skills can keep their existing output locations. Source edits stay in project folders. This is not a registered dynamic/MCP tool.

The PHP GET file route serves only canonical files inside that chat's artifact directory, rejects traversal and symlink escapes, and streams raster images inline or other types as attachments. `?download=1` forces download. HTML/SVG are attachments with sandbox/nosniff headers. Vite proxies `/files`. Conversation Markdown renders published image links as previews with download links; image Markdown also works. No workspace HTTP polling is introduced. Old absolute filesystem links are not automatically published or exposed. Authentication remains local-only/shared, with no per-user artifact permissions.

The right details sidebar includes a collapsible current-chat Files section (name/type/size, raster thumbnails, download). `sync.thread.artifacts` and `patch.artifacts` carry the filesystem listing; the publisher bumps the existing revision after a successful publish so subscribers update without polling. Reconnect rescans storage. Manual filesystem edits are picked up on the next workspace revision or sync; there is no filesystem watcher. Files are never stored in a separate artifact table.

## Phinx migrations

`robmorgan/phinx` now owns schema changes through `server/phinx.php` and `server/database/migrations/`. Run `vendor/bin/phinx migrate`, `rollback`, or `status` from `server/`. Configuration shares `database_path` / `CRABASE_DB` with Store; CLI reads the existing `.env`. Composer resolves dependencies against PHP 8.1 to retain the declared minimum.

Store only opens/configures the SQLite connection; schema creation, upgrades, and implicit starter-data seeding have been removed. Each initial table has its own migration that creates or validates/adopts the table without rewriting rows; incompatible old columns cause transactional failure. Each `down()` drops its table and is only appropriate for disposable dev databases. `WorkspaceSeed` optionally registers Crabase without creating conversations. Future migrations need reversible `change()` or explicit `up()`/`down()` methods.

Deployment order: stop workers, back up via SQLite backup API, migrate, start on success. Current workspace was backed up under `server/runtime/before-phinx-20260909-013853.sqlite`, baselined, and checked for unchanged application rows. Rollbacks were exercised only on temporary databases. `npm test` now covers fresh creation, adoption, repeated migration, rollback/reapply, idempotent seed, and incompatible-schema transactional rollback. Webman Eloquent is now installed; see the model notes below.


## Eloquent models and persistent users

Use `support\Model` via `webman/database`. Eight table models live in `app/model/` with explicit keys/fillable fields and relationships. Automatic timestamps are disabled to preserve the existing ISO date fields and tables without timestamps. Actions dispatches to named methods and uses Eloquent for CRUD; queue/streaming SQL and optimized snapshot aggregation remain explicit. Store's PDO comes from `support\Db` in the current Workerman context, never a separately cached PDO. Keep model writes and raw writes on that same connection. Actions notify the workspace revision after mutations; bulk Eloquent updates do not implicitly emit patches.

The unshipped combined baseline was split at the user's request. Version `20260909000000` remains applied on existing installs; the subsequent per-table files adopt existing tables without deleting rows. Users and message linkage are separate migrations ending in `000007` and `000008`. The pre-users backup is `server/runtime/before-users-20260909-015410.sqlite`.

Users store id/name/avatar_url/created_at. The two existing profiles and distinct historical human authors were retained. New messages require a valid user_id; assistant/tool/guide rows have no human user. Names currently remain unique; revisit display-name vs provider identity when OAuth is implemented. Profiles are not authenticated accounts yet. Settings lists server users, and avatar changes persist via the userAvatar WebSocket action. Browser-local legacy avatar overrides are no longer read. OAuth is deferred as requested.


## Open folder project picker

`components/ProjectDialog.tsx` is a searchable directory browser. `projectFolders` lists immediate readable child folders and a bounded parent path over the existing WebSocket; filtering is local to the displayed directory. `WorkspaceFolders` shares canonical path validation between listing and project creation, rejecting outside paths, workspace-root selection, hidden directories, and symlink escapes. The project action derives its name from the selected directory and returns an existing project ID when already registered. No custom-name/path inputs, folder creation, recursive scans, or HTTP refresh loops are introduced.

## Project files and Git changes

Project chats expose a dedicated code panel beside the existing chat-details panel. The workspace follows the Pierre Trees editor composition: open file and review tabs share the larger editor stage on the left, while a persistent right navigator switches between files and Git changes. `@pierre/trees` renders the bounded file tree with Git decorations, and `@pierre/diffs` supplies both lightweight editable file surfaces and unified change reviews so their syntax, typography, and geometry stay consistent. The project tools are lazy-loaded. Drafts survive panel toggles while the workspace remains mounted and save automatically when focus leaves the editor; closing a still-dirty tab asks before discarding it.

The `projectWorkspace`, `projectFile`, `projectDiff`, and `projectSave` WebSocket actions resolve registered project roots through `WorkspaceFolders`. File access rejects absolute paths, traversal, symlinks, binary files, unreadable files, and content over 1 MB. Saves validate a SHA-256 version to prevent stale overwrites and atomically replace the file while preserving its permissions. Git uses argument-array subprocesses, lists at most 5,000 tracked/untracked paths, and caps patches at 1 MB. Read actions do not increment the workspace revision; successful writes use the normal revision notification path. Staging, discard, rename, drag/drop, filesystem watching, and HTTP polling remain out of scope.

The code and details panels are independently keyboard- and pointer-resizable from their left edges and store their widths locally. They can stack beside the conversation. The code panel's focus control expands it across the main conversation area; the left workspace sidebar remains a separate sibling and stays visible on desktop. Exiting focus restores the saved code-panel width.

## Subagent activity

The Codex worker captures `collabAgentToolCall` and `subAgentActivity` items into one `messages` row with role `agent_activity` per main turn. `AgentActivity` reduces lifecycle events, merges spawn placeholders into real child IDs, and retains task prompts, names, reported status/results, and available child message/tool events. Unrelated thread events are ignored. The UI does not launch agents or poll child sessions; it depends on events emitted by the installed app-server. Up to eight recent child command outputs are retained per agent, bounded in size.

The existing message patch/sync channel persists and delivers the JSON activity block. `components/AgentActivity.tsx` renders compact expandable task rows in the right sidebar below Artifacts; ChatPage filters activity records out of the conversation. Details remain mounted when the overall block collapses. Successful finished turns auto-collapse unless the reader has made an explicit choice. Failures/unreported outcomes remain expanded; unfinished tasks are marked unknown when the parent ends or the server restarts, never falsely marked successful. Existing approval cards remain the decision UI. No new schema/table, independent Codex process, or child-session polling was added. Protocol lifecycle handling is tested with recorded-shape events and a temporary database; it does not spend model requests.


## Parallel chat scheduler

One `codex app-server` subprocess serves concurrent threads using JSON-RPC over stdio. The worker's jobs map owns per-job message IDs, approval requests, and subagent activity. RPC callbacks capture a job ID; notifications route by thread ID with turn-ID checks against stale completions. `nextJobs` selects the oldest uncancelled queued job per chat and excludes chats with an active job. Default capacity is 12 via `CRABASE_PARALLEL_CHATS`; the queue remains FIFO within each chat. Different chats may share project files; this does not add worktree isolation.

Cancellation and per-request RPC failures stay scoped to the owning job; a failed interrupt does not falsely finish a turn that may still be running. A shared app-server failure marks all active jobs failed, leaves queued jobs available for a new connection, and retries after a short delay. Worker restart similarly finalizes interrupted activity. `parallel_chats.php` uses a single deterministic fake app-server process to test concurrency, FIFO, stream isolation, approvals, cancellation, stale events, and process failure without model calls. The backend has been restarted with parallel scheduling and subagent event capture enabled.

## Integrated terminal

Each chat can open a resizable bottom terminal with Cmd/Ctrl+J or the header terminal button. Multiple tabs persist while the PHP worker runs; hiding the panel, changing active tabs, or reconnecting does not stop their shells. Closing a tab kills that PTY, and a shell that exits closes its tab. Project chats start in the registered project path, while standalone chats use `server/runtime/chats/<chat-id>`.

Ghostty Web owns browser rendering and is loaded only when the dock opens. A single private Node PTY host (`server/bin/terminal-host.mjs`) is owned by the existing WebSocket worker and communicates over JSONL stdio; it adds no public listener. Browser terminal commands stay on the existing WebSocket. PHP resolves working directories and validates chat ownership, terminal IDs, dimensions, and input limits. Sessions are in-memory and end when the workspace worker stops; reconnect output is capped at 1 MB per tab.
