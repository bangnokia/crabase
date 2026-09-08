<?php
$config = require __DIR__.'/crabase.php';
return [
    'default' => 'sqlite',
    'connections' => [
        'sqlite' => [
            'driver' => 'sqlite',
            'database' => $config['database_path'],
            'prefix' => '',
            'foreign_key_constraints' => true,
            'options' => [PDO::ATTR_TIMEOUT => 5],
            'pool' => ['max_connections'=>5, 'min_connections'=>1],
        ],
    ],
];
