<?php
use Phinx\Migration\AbstractMigration;

final class CreateChats extends AbstractMigration
{
    public function up(): void
    {
        $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    archived INTEGER NOT NULL DEFAULT 0,
    thread_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
SQL;
        // Validate pre-Phinx tables before recording their adoption.
        $expected = new PDO('sqlite::memory:');
        $expected->exec($sql);
        $this->execute($sql);
        $columns = $expected->query('PRAGMA table_info(chats)')->fetchAll(PDO::FETCH_ASSOC);
        $actual = $this->getAdapter()->getConnection()->query('PRAGMA table_info(chats)')->fetchAll(PDO::FETCH_ASSOC);
        if ($actual != $columns) throw new RuntimeException('Existing chats schema differs from the baseline.');
        if ($this->fetchAll('PRAGMA foreign_key_check(chats)')) throw new RuntimeException('chats has invalid foreign keys.');
    }

    public function down(): void
    {
        $this->execute('DROP TABLE chats');
    }
}
