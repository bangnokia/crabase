<?php
use Phinx\Seed\AbstractSeed;

final class WorkspaceSeed extends AbstractSeed
{
    public function run(): void
    {
        $statement = $this->getAdapter()->getConnection()->prepare('INSERT OR IGNORE INTO projects (id,name,path) VALUES (?,?,?)');
        $statement->execute(['crabase', 'Crabase', dirname(__DIR__, 3)]);
    }
}
