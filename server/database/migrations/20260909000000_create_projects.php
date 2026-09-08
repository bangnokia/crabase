<?php
use Phinx\Migration\AbstractMigration;

final class CreateProjects extends AbstractMigration
{
    public function up(): void
    {
        $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE
);
SQL;
        // Validate pre-Phinx tables before recording their adoption.
        $expected = new PDO('sqlite::memory:');
        $expected->exec($sql);
        $this->execute($sql);
        $columns = $expected->query('PRAGMA table_info(projects)')->fetchAll(PDO::FETCH_ASSOC);
        $actual = $this->getAdapter()->getConnection()->query('PRAGMA table_info(projects)')->fetchAll(PDO::FETCH_ASSOC);
        if ($actual != $columns) throw new RuntimeException('Existing projects schema differs from the baseline.');
        if ($this->fetchAll('PRAGMA foreign_key_check(projects)')) throw new RuntimeException('projects has invalid foreign keys.');
    }

    public function down(): void
    {
        $this->execute('DROP TABLE projects');
    }
}
