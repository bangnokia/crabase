<?php
use Phinx\Migration\AbstractMigration;
final class CreateAttachments extends AbstractMigration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE messages ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
        $this->execute('CREATE TABLE uploads (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, size INTEGER NOT NULL, received INTEGER NOT NULL DEFAULT 0, mime TEXT, expires INTEGER NOT NULL)');
    }
    public function down(): void
    {
        $this->execute('DROP TABLE uploads');
        $this->execute('ALTER TABLE messages DROP COLUMN attachments');
    }
}
