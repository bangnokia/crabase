<?php
use Phinx\Migration\AbstractMigration;

final class CreateProjectPins extends AbstractMigration
{
    public function up(): void
    {
        $this->execute('CREATE TABLE project_pins (
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, project_id)
        )');
    }
    public function down(): void { $this->execute('DROP TABLE project_pins'); }
}
