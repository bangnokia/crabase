<?php
use Phinx\Migration\AbstractMigration;

final class AddMessageUser extends AbstractMigration
{
    public function up(): void
    {
        $this->execute('ALTER TABLE messages ADD COLUMN user_id TEXT REFERENCES users(id)');
        $this->execute("UPDATE messages SET user_id=(SELECT id FROM users WHERE name=messages.author) WHERE role IN ('user','note')");
    }

    public function down(): void
    {
        $this->execute('ALTER TABLE messages DROP COLUMN user_id');
    }
}
