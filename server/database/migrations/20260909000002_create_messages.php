<?php
use Phinx\Migration\AbstractMigration;

final class CreateMessages extends AbstractMigration
{
    public function up(): void
    {
        $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL REFERENCES chats(id),
    role TEXT NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
SQL;
        // Validate pre-Phinx tables before recording their adoption.
        $expected = new PDO('sqlite::memory:');
        $expected->exec($sql);
        $this->execute($sql);
        $columns = $expected->query('PRAGMA table_info(messages)')->fetchAll(PDO::FETCH_ASSOC);
        $actual = $this->getAdapter()->getConnection()->query('PRAGMA table_info(messages)')->fetchAll(PDO::FETCH_ASSOC);
        if ($actual != $columns) throw new RuntimeException('Existing messages schema differs from the baseline.');
        if ($this->fetchAll('PRAGMA foreign_key_check(messages)')) throw new RuntimeException('messages has invalid foreign keys.');
    }

    public function down(): void
    {
        $this->execute('DROP TABLE messages');
    }
}
