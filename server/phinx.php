<?php
$config = require __DIR__.'/config/crabase.php';
$connection = new PDO('sqlite:'.$config['database_path']);
$connection->exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
return [
    'paths' => [
        'migrations' => __DIR__.'/database/migrations',
        'seeds' => __DIR__.'/database/seeds',
    ],

    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment' => 'workspace',
        'workspace' => ['name' => $config['database_path'], 'suffix' => '', 'connection' => $connection],
    ],
    'version_order' => 'creation',
];
