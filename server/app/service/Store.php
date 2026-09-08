<?php
namespace app\service;

use PDO;
use InvalidArgumentException;

final class Store
{
    private static ?PDO $db = null;

    public static function db(): PDO
    {
        if (self::$db) return self::$db;
        $path = getenv('CRABASE_DB') ?: dirname(__DIR__, 2) . '/runtime/crabase.sqlite';
        $db = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
        $db->exec("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE);
            CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', archived INTEGER NOT NULL DEFAULT 0, thread_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), role TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', turn_id TEXT, cancel INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT REFERENCES chats(id), label TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), rpc_id TEXT NOT NULL, method TEXT NOT NULL, details TEXT NOT NULL, decision TEXT);
            CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
        // Upgrade the first preview without losing existing chats or their related records.
        if (array_filter($db->query('PRAGMA table_info(chats)')->fetchAll(), fn($c) => $c['name'] === 'project_id' && $c['notnull'])) {
            $db->exec('PRAGMA foreign_keys=OFF');
            $db->beginTransaction();
            try {
                $db->exec("CREATE TABLE chats_new (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', archived INTEGER NOT NULL DEFAULT 0, thread_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
                    INSERT INTO chats_new SELECT * FROM chats;
                    DROP TABLE chats;
                    ALTER TABLE chats_new RENAME TO chats;");
                if ($db->query('PRAGMA foreign_key_check')->fetchAll()) throw new \RuntimeException('Chat migration failed integrity check.');
                $db->commit();
            } catch (\Throwable $e) { $db->rollBack(); throw $e; }
            finally { $db->exec('PRAGMA foreign_keys=ON'); }
        }
        $jobColumns = array_column($db->query('PRAGMA table_info(jobs)')->fetchAll(), 'name');
        foreach (['model','effort'] as $column) if (!in_array($column,$jobColumns)) $db->exec("ALTER TABLE jobs ADD COLUMN $column TEXT");
        self::$db = $db;
        if (!self::all('SELECT id FROM projects LIMIT 1')) {
            $db->beginTransaction();
            try {
                self::run('INSERT OR IGNORE INTO projects VALUES (?,?,?)', ['crabase', 'Crabase', dirname(__DIR__, 3)]);
                foreach (['Your first shared workspace' => "Welcome to **Crabase**. This is a starter conversation, not an agent run.\n\nYour chats, project context, and agent work live together here. Start a new thread to ask Codex to explore this repository, or switch the composer to **Note** to capture an idea without running an agent.\n\nThis initial installation is local-only. Team accounts and access controls are the next step before sharing it over a network.", 'Explore the codebase' => "A good first task is to understand what is already here.\n\nTry asking Codex: **Walk me through this repository and explain how the frontend connects to the PHP backend.**\n\nCodex only starts when you send an agent request. Nothing has run in this starter conversation.", 'Plan what comes next' => "Use this conversation to collect ideas for your workspace.\n\n- Team sign-in and project membership\n- Shared tasks and worktree isolation\n- Review and merge flows\n\nThese are ideas for the next iteration, not implemented features. You can add a note below or ask Codex to help plan the work."] as $title => $body) {
                    $id = bin2hex(random_bytes(8)); $now = gmdate('c');
                    self::run('INSERT INTO chats (id,project_id,title,created_at,updated_at) VALUES (?,?,?,?,?)', [$id,'crabase',$title,$now,$now]);
                    self::run('INSERT INTO messages (chat_id,role,author,body,created_at) VALUES (?,?,?,?,?)', [$id,'guide','Crabase',$body,$now]);
                }
                $db->commit();
            } catch (\Throwable $e) { $db->rollBack(); throw $e; }
        }
        return $db;
    }

    public static function all(string $sql, array $args = []): array { $s = self::db()->prepare($sql); $s->execute($args); return $s->fetchAll(); }
    public static function run(string $sql, array $args = [], bool $notify = true): void {
        $s = self::db()->prepare($sql); $s->execute($args);
        if ($s->rowCount() && $notify) self::db()->exec("INSERT INTO settings VALUES ('revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1");
    }
    public static function text(mixed $value, int $max = 20000): string {
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) throw new InvalidArgumentException("Enter between 1 and $max characters.");
        return trim($value);
    }
    public static function event(?string $chat, string $label): void { self::run('INSERT INTO events (chat_id,label,created_at) VALUES (?,?,?)', [$chat,$label,gmdate('c')]); }
    public static function thread(string $id): array {
        $chat = self::all('SELECT * FROM chats WHERE id=?', [$id])[0] ?? null;
        if (!$chat) throw new InvalidArgumentException('Conversation not found.');
        return ['chat'=>$chat, 'messages'=>self::all('SELECT * FROM messages WHERE chat_id=? ORDER BY id', [$id]), 'approvals'=>self::all('SELECT * FROM approvals WHERE chat_id=? AND decision IS NULL', [$id])];
    }
    public static function agentName(): string {
        $config = require dirname(__DIR__,2).'/config/crabase.php';
        return trim((string)$config['agent_name']) ?: 'Crab';
    }
    public static function snapshot(): array {
        return ['agentName'=>self::agentName(), 'models'=>json_decode(self::all("SELECT value FROM settings WHERE key='models'")[0]['value'] ?? '[]',true), 'projects'=>self::all('SELECT * FROM projects ORDER BY name'), 'chats'=>self::all('SELECT c.*, p.name AS project_name, (SELECT group_concat(DISTINCT author) FROM messages m WHERE m.chat_id=c.id AND m.role='user') AS participants FROM chats c LEFT JOIN projects p ON p.id=c.project_id ORDER BY updated_at DESC, c.rowid DESC'), 'events'=>self::all('SELECT e.*, c.title FROM events e LEFT JOIN chats c ON c.id=e.chat_id ORDER BY e.id DESC LIMIT 50'), 'runtime'=>self::all("SELECT value FROM settings WHERE key='runtime'")[0]['value'] ?? 'offline'];
    }
}
