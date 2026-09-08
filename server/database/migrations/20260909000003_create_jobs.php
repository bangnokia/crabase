<?php
use Phinx\Migration\AbstractMigration;

final class CreateJobs extends AbstractMigration
{
    public function up(): void
    {
        $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL REFERENCES chats(id),
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    turn_id TEXT,
    cancel INTEGER NOT NULL DEFAULT 0,
    model TEXT,
    effort TEXT
);
SQL;
        // Validate pre-Phinx tables before recording their adoption.
        $expected = new PDO('sqlite::memory:');
        $expected->exec($sql);
        $this->execute($sql);
        $columns = $expected->query('PRAGMA table_info(jobs)')->fetchAll(PDO::FETCH_ASSOC);
        $actual = $this->getAdapter()->getConnection()->query('PRAGMA table_info(jobs)')->fetchAll(PDO::FETCH_ASSOC);
        if ($actual != $columns) throw new RuntimeException('Existing jobs schema differs from the baseline.');
        if ($this->fetchAll('PRAGMA foreign_key_check(jobs)')) throw new RuntimeException('jobs has invalid foreign keys.');
    }

    public function down(): void
    {
        $this->execute('DROP TABLE jobs');
    }
}
