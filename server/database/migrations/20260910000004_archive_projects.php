<?php
use Phinx\Migration\AbstractMigration;

final class ArchiveProjects extends AbstractMigration
{
    public function up(): void { $this->execute('ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1))'); }
    public function down(): void { $this->execute('ALTER TABLE projects DROP COLUMN archived'); }
}
