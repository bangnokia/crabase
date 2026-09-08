<?php
use Phinx\Migration\AbstractMigration;

final class CreateUsers extends AbstractMigration
{
    public function up(): void
    {
        $this->execute("CREATE TABLE users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            avatar_url TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )");
        // Preserve the two existing local profiles and historical human authors.
        $statement = $this->getAdapter()->getConnection()->prepare('INSERT INTO users VALUES (?,?,?,?)');
        foreach (['user1'=>'https://i.pravatar.cc/96?img=12', 'user2'=>'https://i.pravatar.cc/96?img=47'] as $name=>$avatar) {
            $statement->execute([bin2hex(random_bytes(8)), $name, $avatar, gmdate('c')]);
        }
        $this->execute("INSERT INTO users (id,name,created_at)
            SELECT lower(hex(randomblob(8))), author, MIN(created_at) FROM messages
            WHERE role IN ('user','note') AND author NOT IN (SELECT name FROM users) GROUP BY author");
    }

    public function down(): void
    {
        $this->execute('DROP TABLE users');
    }
}
