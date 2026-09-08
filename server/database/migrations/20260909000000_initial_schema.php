<?php
use Phinx\Migration\AbstractMigration;

final class InitialSchema extends AbstractMigration
{
    private const SCHEMA = <<<'SQL'
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE);
            CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', archived INTEGER NOT NULL DEFAULT 0, thread_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), role TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', turn_id TEXT, cancel INTEGER NOT NULL DEFAULT 0, model TEXT, effort TEXT);
            CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT REFERENCES chats(id), label TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), rpc_id TEXT NOT NULL, method TEXT NOT NULL, details TEXT NOT NULL, decision TEXT);
            CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
SQL;

    public function up(): void
    {
        // Adopt the existing current schema without rewriting any application rows.
        $expected = new PDO('sqlite::memory:');
        $expected->exec(self::SCHEMA);
        $this->execute(self::SCHEMA);
        foreach (['projects', 'chats', 'messages', 'jobs', 'events', 'approvals', 'settings'] as $table) {
            $columns = $expected->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC);
            if ($this->getAdapter()->getConnection()->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC) != $columns) {
                throw new RuntimeException("Existing $table schema differs from the baseline. Upgrade with the previous Crabase version before migrating.");
            }
        }
        if ($this->fetchAll('PRAGMA foreign_key_check')) throw new RuntimeException('Database has invalid foreign keys.');
    }

    public function down(): void
    {
        // This removes all application data: use only with a disposable development database.
        foreach (['approvals', 'events', 'jobs', 'messages', 'chats', 'projects', 'settings'] as $table) {
            $this->execute("DROP TABLE $table");
        }
    }
}
