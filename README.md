# Crabase

A Codex-style shared coding workspace, built with React, PHP Webman/Workerman, and SQLite. The PHP worker talks directly to `codex app-server` over JSONL stdin/stdout. Node is used only to build or develop the frontend.

## Run

Requires macOS or Linux, PHP 8.1+ with PDO SQLite, pcntl and posix, Composer, Node 20.19+ or 22.12+, and an installed, authenticated Codex CLI.

```sh
npm install
composer install --working-dir=server
npm run build
cd server
php start.php start
```

Open **http://127.0.0.1:8787**. Stop the server with Ctrl+C, or `php start.php stop` from `server/`. For background operation: `php start.php start -d`.

For frontend development, keep PHP running and run `npm run dev` in another terminal. Open http://127.0.0.1:5173. Vite proxies the WebSocket to PHP; production serves compiled static files directly from Webman.

If `codex` is not on PHP's PATH, set `CODEX_BIN` to its absolute executable path before starting PHP. Authentication and model defaults come from the local Codex CLI configuration. Run `codex login` separately if necessary. `CRABASE_DB` optionally overrides the SQLite path (mainly for isolated testing).

## Included

- Responsive desktop-style interface, light/dark themes, project sidebar, search (⌘/Ctrl K), new-thread shortcut (⌘/Ctrl N), composer, and activity panel.
- Add existing project folders; persistent threads, attributed notes, archives, and activity.
- Live updates between browser tabs through a Workerman WebSocket process.
- Real Codex requests, streamed responses, terminal/file activity, command/file approval dialogs, cancellation, and queued requests.
- SQLite in WAL mode, busy timeout, foreign keys, prepared statements, and short transactions.

The three starter conversations are clearly identified as getting-started content, not real agent runs. In the composer, **Codex** invokes the agent; **Note** only saves a message. Notes are not automatically injected into the agent's context. Project paths are selected on the server's filesystem, not uploaded from a browser.

## Current boundary

This is a **local foundation**, not a production team deployment. Both PHP listeners bind to loopback and WebSocket origins are restricted to the local preview. All local browsers share one workspace. The display name is not authentication. Add team authentication, project membership/authorization, and a secure deployment configuration before exposing the app to other users.

One Codex turn runs at a time across this instance to avoid concurrent agent edits. All chats in a project currently use its existing working directory; separate Git worktrees and isolated workers are not implemented yet. Direct edits by someone on the machine can still conflict with an agent's edits. Codex runs with `workspace-write` and `on-request` approvals using the local account's credentials. Unsupported interactive server requests receive an explicit error; forms and other advanced desktop integrations are not implemented.

Conversation display data lives in `server/runtime/crabase.sqlite`; agent context lives in Codex's own thread storage. Back up both to preserve the full workspace. App archiving hides the chat locally and does not archive the upstream Codex thread. Interrupted server runs are marked failed on restart and can be resumed by sending another message.

## Layout

```text
web/src/                   React UI and styles
server/app/service/Actions.php  Validated WebSocket commands
server/app/service/Store.php    SQLite schema and persistence
server/app/process/Codex.php    Codex lifecycle, queue, events, WebSocket updates
server/runtime/            Local data and logs (ignored)
```

## Check

With the PHP server running:

```sh
npm run build
npm test
```

The smoke check uses two real WebSocket clients to verify commands, origin rejection, validation, persisted notes, incremental text updates, reconnect recovery, standalone chats, folder threads, and archive/restore. It simulates a Codex-style append on its own test note, then archives its test threads; it does not invoke a model or modify project files. Codex integration was also manually checked against the installed CLI with a text-only request without tool use.

## WebSocket protocol

After static HTML/JS/CSS load, all workspace data and commands use one WebSocket connection. There are no GET/POST refresh loops or HTTP fallback. Clients send `{id, action, data}` and receive `{id, result}` or `{id, error}`. `sync` provides initial state and subscribes to an optional `chat_id`; subsequent `patch` events contain changed state collections, message upserts, text appends, and pending approvals. Reconnects resynchronize state; unacknowledged writes are reported as uncertain and never automatically replayed.

Regular chats have no project. A project is any existing readable directory on the shared machine, whether or not it contains code or Git. Selecting a project starts its threads in that directory. Standalone agent chats use a private scratch directory under `server/runtime/chats/<chat-id>`. Existing project associations are preserved during migration.

## Dummy users

Open `http://127.0.0.1:8787/?user=user1` and `http://127.0.0.1:8787/?user=user2` in separate tabs to test collaboration. Settings → **Test user for this tab** switches identities. The choice lives in sessionStorage, survives a reload, and does not change other tabs. The launch query is consumed so copying a chat link does not switch its recipient's identity. Notes, agent prompts, and their activity entries retain the selected author. These are local test identities, not authenticated accounts or access boundaries.

## Model and reasoning

The composer loads the actual `model/list` catalog from the persistent Codex process over WebSocket. Choose a model and one of its supported reasoning levels. Choices are remembered per tab, validated on the backend, and saved with each queued job; changing the picker does not change an already queued turn. Each agent turn sends its selected `model` and `effort` to Codex. Notes do not invoke a model. The process starts when the first browser connects so the catalog is available before sending a prompt.

The UI uses locally bundled DM Sans with 15px chat/composer text and larger supporting labels; fonts require no external font service.

## Agent display name

The agent is called **Crab** by default. Edit `server/config/crabase.php` or start the backend with an environment override:

```sh
CRABASE_AGENT_NAME="Your agent name" php server/start.php start
```

Restart the running backend after configuration changes. This names the agent in the UI, including historical assistant-message headers, composer, approval prompts, and new activity. Codex remains the underlying runtime; model names and message content are not renamed.
