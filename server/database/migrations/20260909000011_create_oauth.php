<?php
use Phinx\Migration\AbstractMigration;
final class CreateOauth extends AbstractMigration
{
    public function up(): void
    {
        $this->execute('CREATE TABLE oauth_flows (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, expires INTEGER NOT NULL)');
        $this->execute('CREATE TABLE oauth_identities (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES accounts(user_id), PRIMARY KEY(provider,subject), UNIQUE(provider,user_id))');
    }
    public function down(): void
    {
        $this->execute('DROP TABLE oauth_identities');
        $this->execute('DROP TABLE oauth_flows');
    }
}
