<?php
use Phinx\Migration\AbstractMigration;
final class AddJobMessage extends AbstractMigration
{
    public function up(): void { $this->execute('ALTER TABLE jobs ADD COLUMN message_id INTEGER REFERENCES messages(id)'); }
    public function down(): void { $this->execute('ALTER TABLE jobs DROP COLUMN message_id'); }
}
