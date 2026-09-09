# Crabase

A Codex-style shared coding workspace, built with React, PHP Webman/Workerman, and SQLite. The PHP worker talks directly to `codex app-server` over JSONL stdin/stdout. Node also runs the local PTY host used by the integrated terminal.

## Run

Requires macOS or Linux, PHP 8.1+ with PDO SQLite, pcntl and posix, Composer, Node 22.12+, and an installed, authenticated Codex CLI.

```sh
npm install
composer install --working-dir=server
npm run build
cd server
vendor/bin/phinx migrate
php bin/create-admin.php  # First install only; prompts securely for credentials
vendor/bin/phinx seed:run  # Optional: add this repository as a project
php start.php start
```

Open **http://127.0.0.1:8787**. Stop the server with Ctrl+C, or `php start.php stop` from `server/`. For background operation: `php start.php start -d`.

For frontend development, keep PHP running and run `npm run dev` in another terminal. Open http://127.0.0.1:5173. Vite proxies the WebSocket to PHP; production serves compiled static files directly from Webman.

If `codex` is not on PHP's PATH, set `CODEX_BIN` to its absolute executable path before starting PHP. Authentication and model defaults come from the local Codex CLI configuration. Run `codex login` separately if necessary. `CRABASE_DB` optionally overrides the SQLite path (mainly for isolated testing).

## Accounts and first admin

### Prompt attachments

Attach with the paperclip, drag files onto the composer, or paste clipboard images/files (when exposed by the browser). Ordinary text paste is unchanged. Each message accepts up to 10 files, 5 MB each; empty files are rejected. Upload chips show progress, removal and retry. Sending waits for all uploads, and failed sends keep the draft. Attachments also work for notes and new project-less chats.

Uploads use small authenticated WebSocket chunks, staged privately under `.artifacts/.uploads`, with at most 30 pending files per user. Abandoned uploads expire after 24 hours and are cleaned hourly and on startup/upload. Sending moves each file once into `.artifacts/<chat-id>` and stores its original name and metadata on the message. Include `.artifacts` in backups. Supported raster images are sent to Codex as local image inputs (40-megapixel limit); other files are provided as paths for the agent to read, not automatically executed or parsed. HTML/SVG and other non-raster files download rather than render in the app. No OCR/document-conversion service is added.

### First admin

There is no public signup and no built-in/default password. After migrating, run `php server/bin/create-admin.php` from the repository root. It prompts for a unique display name, login email and password without echoing the password, and refuses to bootstrap a second enabled admin. Use a long, unique password (6–72 bytes accepted). Credentials are stored only as password hashes in the local database, not source files.

Sign in, then use **Settings → Admin → Users** to list, create, edit, disable users or reset their passwords. The final enabled administrator cannot be disabled or demoted. Disabled accounts and password resets revoke their sessions. If all admins lose access, recover from a database backup or use a reviewed operator recovery procedure; there is no unauthenticated password-reset endpoint.

**Settings → Profile** manages the display name, login email, avatar URL and optional Git author name/email. Changing login email or password requires the current password; changing a password signs the user out. Empty avatar URLs use Gravatar based on a hash of the login email, then initials if unavailable. Gravatar is a third-party service and receives the email hash and image request. Git emails can be GitHub-verified or `noreply` addresses; only configured participants receive agent-requested `Co-authored-by` trailers. These trailers are instructions to the agent, not a Git hook enforcing every manual commit.

Sessions last seven days in HttpOnly, SameSite=Strict cookies. The HTTP shell/assets may load without login, but workspace data, WebSocket commands and artifact downloads require an enabled account. Login allows ten attempts per connection IP per fifteen minutes; loopback/SSH users share that limit. Cookies are intentionally non-Secure for this loopback HTTP setup; HTTPS deployment requires reviewed secure-cookie/origin configuration before exposure. Optional TDA Passport OAuth2 is described below.

Existing historical identities remain for message attribution but cannot sign in until an operator explicitly migrates them to accounts. The initial admin command creates a new user rather than silently granting access to historical identities.

### TDA Passport OAuth2 (local deployment)

Register the exact redirect URL `http://127.0.0.1:8787/auth/oauth/callback` with TDA Passport. Put `CRABASE_OAUTH_CLIENT_ID` and `CRABASE_OAUTH_CLIENT_SECRET` in the ignored `.env` (never frontend code or Git), migrate, and restart PHP. The login screen then offers **Sign in with TDA**. PHP cURL with TLS support is required. The authorization, token and user endpoints are fixed to `https://passport.tdagroup.online/oauth/authorize`, `/oauth/token`, and `/api/user` respectively.

The integration uses authorization code + S256 PKCE, browser-bound one-use state (10-minute expiry), verified TLS, and server-side token exchange. Provider access tokens are used only to fetch the profile, then discarded. First login requires a top-level `id`, `email`, and either boolean `email_verified: true` or a non-null valid `email_verified_at` timestamp from `/api/user`, matching an existing enabled Crabase account. It never signs up users or changes their roles. Later logins use the stored provider ID binding. Password login remains available. Login completes on `127.0.0.1:8787`, including when initiated from Vite. The OAuth flow cookie is HttpOnly/SameSite=Lax so the provider redirect can complete; normal session cookies remain Strict. This fixed loopback callback is not public-deployment configuration.

## VPS setup

Crabase requires login through email/password or configured TDA Passport OAuth2, but project authorization and OS/worktree isolation are not implemented. All enabled users are trusted collaborators with access to the shared workspace and its terminal. Keep both listeners on loopback and connect through an SSH tunnel. Do not expose ports 8787 or 8788 through a public firewall, reverse proxy, or container port mapping.

### 1. Install prerequisites

The VPS needs Git, Composer, PHP 8.1+ with PDO SQLite, `pcntl`, and `posix`, Node 22.12+, npm, and the Codex CLI. On Ubuntu/Debian, install the system packages first:

```sh
sudo apt update
sudo apt install -y git unzip php-cli php-sqlite3 php-mbstring composer
php -m | grep -E 'pcntl|posix|pdo_sqlite'
node --version
npm --version
composer --version
codex --version
```

Install a current Node release and the Codex CLI using their official instructions if the distribution packages do not meet the versions above.

### 2. Create a dedicated user and install Crabase

Run the application and Codex under the same unprivileged account so the persistent worker can read that account's Codex authentication and only the intended workspace folders.

```sh
sudo adduser --disabled-password --gecos '' crabase
sudo -iu crabase
git clone https://github.com/bangnokia/crabase.git ~/crabase
cd ~/crabase
npm ci
composer install --working-dir=server --no-dev --optimize-autoloader
mkdir -p server/runtime ~/workspaces
cp .env.example .env
```

Edit `.env` for the VPS:

```dotenv
CRABASE_WORKSPACE_ROOT=/home/crabase/workspaces
CRABASE_AGENT_NAME=Crab
CRABASE_PARALLEL_CHATS=12
CRABASE_DB=/home/crabase/crabase/server/runtime/crabase.sqlite
CODEX_BIN=/absolute/path/from-command-v-codex
```

`CRABASE_WORKSPACE_ROOT` is the highest directory users may browse and select as a project. Keep it narrow. Set `CODEX_BIN` to the output of `command -v codex`; omit it only when `codex` is already on the service PATH.

Authenticate Codex as the service user, then build and initialize the database:

```sh
codex login
npm run build
cd server
vendor/bin/phinx migrate
# Optional: vendor/bin/phinx seed:run
php bin/create-admin.php  # First installation only
php start.php start
```

Confirm that http://127.0.0.1:8787 responds on the VPS, then stop the foreground process with Ctrl+C.

### 3. Run with systemd

Create `/etc/systemd/system/crabase.service` as root. Adjust the PHP path if `command -v php` is not `/usr/bin/php`.

```ini
[Unit]
Description=Crabase workspace
After=network.target

[Service]
Type=simple
User=crabase
Group=crabase
WorkingDirectory=/home/crabase/crabase/server
Environment=HOME=/home/crabase
Environment=PATH=/home/crabase/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/php start.php start
ExecStop=/usr/bin/php start.php stop
Restart=on-failure
RestartSec=3
KillMode=mixed

[Install]
WantedBy=multi-user.target
```

Enable it and inspect its logs:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now crabase
sudo systemctl status crabase
sudo journalctl -u crabase -f
```

### 4. Connect privately

From your computer, forward both the HTTP and WebSocket listeners:

```sh
ssh -N \
  -L 8787:127.0.0.1:8787 \
  -L 8788:127.0.0.1:8788 \
  crabase@YOUR_VPS_HOST
```

Keep that terminal open and visit http://127.0.0.1:8787 locally. The browser loads the built frontend through port 8787 and connects to the WebSocket through the forwarded port 8788.

If UFW is enabled, allow SSH but do not add rules for Crabase's ports:

```sh
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

### 5. Update, back up, and restore

Before an update, make a consistent SQLite backup and preserve generated artifacts and Codex thread storage:

```sh
sudo -iu crabase
cd ~/crabase
mkdir -p ~/backups
sqlite3 server/runtime/crabase.sqlite \
  ".backup '/home/crabase/backups/crabase.sqlite'"
cp -a ~/workspaces/.artifacts ~/backups/artifacts
cp -a ~/.codex ~/backups/codex
```

An update should stop the persistent worker, install the checked-in dependency versions, rebuild, migrate, and restart:

```sh
sudo systemctl stop crabase
sudo -iu crabase
cd ~/crabase
git pull --ff-only
npm ci
composer install --working-dir=server --no-dev --optimize-autoloader
npm run build
cd server && vendor/bin/phinx migrate
exit
sudo systemctl start crabase
sudo systemctl status crabase
```

To restore, stop Crabase, replace `server/runtime/crabase.sqlite` with the backup, restore `.artifacts` and `~/.codex` to their original locations and ownership, then start the service. Never run migration rollback commands against the only copy of workspace data.

For failures, check `journalctl -u crabase`, confirm the service user's `CODEX_BIN`, run `codex login` as that user, verify directory ownership, and run `vendor/bin/phinx status` from `server/`.

## Included

- Responsive desktop-style interface, light/dark themes, project sidebar, search (⌘/Ctrl K), new-thread shortcut (⌘/Ctrl N), composer, and activity panel.
- Add existing project folders; persistent threads, attributed notes, archives, and activity.
- Live updates between browser tabs through a Workerman WebSocket process.
- Real Codex requests, streamed responses, terminal/file activity, command/file approval dialogs, cancellation, and queued requests.
- SQLite in WAL mode, busy timeout, foreign keys, prepared statements, and short transactions.

Existing installations may retain the three getting-started conversations; fresh databases no longer create them automatically. In the composer, **Enter** or the send arrow invokes the agent; the note icon only saves a message. Notes are not automatically injected into the agent's context. Project paths are selected on the server's filesystem, not uploaded from a browser.

## Current boundary

This is a **local foundation**, not a production team deployment. Both PHP listeners bind to loopback and WebSocket origins are restricted to the local preview. Email/password sessions protect workspace commands and artifact downloads. All signed-in users share one workspace, filesystem and terminal privileges; add project membership/authorization, isolation, TLS and a reviewed deployment configuration before public exposure.

One Codex turn runs at a time across this instance to avoid concurrent agent edits. All chats in a project currently use its existing working directory; separate Git worktrees and isolated workers are not implemented yet. Direct edits by someone on the machine can still conflict with an agent's edits. Codex runs with `danger-full-access` and `never` approvals using the local account's credentials. Unsupported interactive server requests receive an explicit error; forms and other advanced desktop integrations are not implemented.

Conversation display data lives in `server/runtime/crabase.sqlite`; agent context lives in Codex's own thread storage. Back up both to preserve the full workspace. App archiving hides the chat locally and does not archive the upstream Codex thread. Interrupted server runs are marked failed on restart and can be resumed by sending another message.

## Layout

```text
web/src/App.tsx            App composition and actions
web/src/pages/             New-chat and conversation pages
web/src/components/        Shared interface components
web/src/hooks/             WebSocket, routing, preferences
web/src/lib/               Pure route, identity, and streaming helpers
web/src/styles/tokens.css   Design tokens for both themes
web/src/style.css          Component layouts and states
web/tests/                 Native Node frontend checks
design.md                  Crabase design system
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

## Collaboration accounts

Only administrators can register projects or browse the project-creation folder picker. Members can use existing projects and create chats within them.

Create accounts in Settings → Admin → Users. Use separate browser profiles to test different signed-in users; tabs in the same browser profile share the session cookie. The old `?user=` switch is ignored. Messages and notes are attributed to the server-authenticated user.

## Model and reasoning

The composer loads the actual `model/list` catalog from the persistent Codex process over WebSocket. Choose a model and one of its supported reasoning levels. Choices are remembered per tab, validated on the backend, and saved with each queued job; changing the picker does not change an already queued turn. Each agent turn sends its selected `model` and `effort` to Codex. Notes do not invoke a model. The process starts when the first browser connects so the catalog is available before sending a prompt.

The UI uses locally bundled DM Sans with 15px chat/composer text and larger supporting labels; fonts require no external font service.

## Agent display name

The agent is called **Crab** by default. Edit `server/config/crabase.php` or start the backend with an environment override:

```sh
CRABASE_AGENT_NAME="Your agent name" php server/start.php start
```

Restart the running backend after configuration changes. This names the agent in the UI, including historical assistant-message headers, composer, approval prompts, and new activity. Codex remains the underlying runtime; model names and message content are not renamed.

### Generated files

Deliverables are stored persistently under the configured `CRABASE_WORKSPACE_ROOT` in `.artifacts/<chat-id>/`. The agent generates them there and runs a publish command that registers the file and returns its browser URL; files created elsewhere are copied in. Images can preview in chat; all file types can download through the local PHP server. Existing raw filesystem links must be republished. Back up `.artifacts` alongside the database; do not treat it as a temporary directory.

### Database migrations (Phinx)

Run from `server/`. Phinx and the application use the same `CRABASE_DB` path (default `server/runtime/crabase.sqlite`), including `.env`. Configuration is in `server/phinx.php`; versioned PHP migrations live in `server/database/migrations/`.

```bash
vendor/bin/phinx status
vendor/bin/phinx create AddChatDescription
vendor/bin/phinx migrate
vendor/bin/phinx rollback  # Latest migration; development database only
vendor/bin/phinx migrate   # Reapply after editing an unshipped migration
```

Use explicit `up()` and `down()` methods for changes that cannot be automatically reversed by `change()`. Once deployed, leave migration files unchanged and add another migration. Phinx records applied versions in `phinxlog`. SQLite migrations run transactionally; irreversible data loss requires a backup, even when schema rollback is possible.

For isolated development, prefix **every command** with `CRABASE_DB=/absolute/path/dev.sqlite`. Each initial table has its own migration. Rolling back drops the latest table/change; `rollback -t 0` drops all application tables and their data. Do not run it against the workspace database you want to keep. Artifact files are outside migration scope.

Deployment: stop the server, create a consistent SQLite backup using SQLite's backup API (including WAL contents), run `vendor/bin/phinx migrate`, and start the server only after success. Workers no longer create, upgrade, or seed tables on connection. `vendor/bin/phinx seed:run` optionally registers the Crabase project; it does not insert dummy conversations.

The initial table migrations can adopt the current pre-Phinx schema without rewriting application rows. It rejects older/incompatible columns; upgrade those databases using the previous application release first. Always back up before adoption.

### Models and users

`server/app/model/` contains Webman Eloquent models: User, Project, Chat, Message, Job, Approval, Event, and Setting. Relationships connect projects to chats and users to their messages. `Actions` validates input and coordinates model operations; Phinx owns migrations. `config/database.php` uses SQLite with foreign keys and Webman's connection pool. Low-level streaming/queue SQL uses the same context connection through Store, preserving transactions and revision notifications.

Users persist in SQLite with stable IDs, names, avatar URLs, and creation timestamps. Existing human message authors are backfilled into `messages.user_id`. The WebSocket boundary derives message identity from the authenticated session and ignores client `user_id`. Accounts contain private login and optional Git identity fields; workspace snapshots expose only public display identity. Optional TDA Passport OAuth2 links existing accounts. Project permissions remain deferred; do not expose the loopback service publicly.

### Parallel agent chats

The backend runs one persistent `codex app-server` subprocess and communicates through JSON-RPC over stdin/stdout. Different chats can run concurrently; messages in the same chat remain sequential. The default is 12 active chats, configurable with `CRABASE_PARALLEL_CHATS=12` in `.env`. Restart the backend after changing it. Cancelling one chat does not cancel other chats. Chats in the same project still share its files; Git worktree isolation is not implemented.
