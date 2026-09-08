<?php
use Phinx\Migration\AbstractMigration;

final class CreateEvents extends AbstractMigration
{
    public function up(): void
    {
        $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT REFERENCES chats(id),
    label TEXT NOT NULL,
    created_at TEXT NOT NULL
);
SQL;
        // Validate pre-Phinx tables before recording their adoption.
        $expected = new PDO('sqlite::memory:');
        $expected->exec($sql);
        $this->execute($sql);
        $columns = $expected->query('PRAGMA table_info(events)')->fetchAll(PDO::FETCH_ASSOC);
        $actual = $this->getAdapter()->getConnection()->query('PRAGMA table_info(events)')->fetchAll(PDO::FETCH_ASSOC);
        if ($actual != $columns) throw new RuntimeException('Existing events schema differs from the baseline.');
        if ($this->fetchAll('PRAGMA foreign_key_check(events)')) throw new RuntimeException('events has invalid foreign keys.');
    }

    public function down(): void
    {
        $this->execute('DROP TABLE events');
    }
}
