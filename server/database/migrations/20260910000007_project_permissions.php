<?php
use Phinx\Migration\AbstractMigration;

final class ProjectPermissions extends AbstractMigration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE projects ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'))");
        $this->execute('CREATE TABLE project_members (
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (project_id, user_id)
        )');
    }
    public function down(): void
    {
        $this->execute('DROP TABLE project_members');
        $this->execute('ALTER TABLE projects DROP COLUMN visibility');
    }
}
