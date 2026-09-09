<?php
use Phinx\Migration\AbstractMigration;

final class ProjectWorktrees extends AbstractMigration
{
    public function up(): void
    {
        $this->execute('ALTER TABLE projects ADD COLUMN parent_id TEXT REFERENCES projects(id) ON DELETE RESTRICT');
        $this->execute('CREATE INDEX projects_parent ON projects(parent_id)');
    }
    public function down(): void
    {
        $this->execute('DROP INDEX projects_parent');
        $this->execute('ALTER TABLE projects DROP COLUMN parent_id');
    }
}
