<?php
foreach ([dirname(__DIR__,2).'/.env', dirname(__DIR__,3).'/.env'] as $env) if (is_file($env)) foreach (file($env, FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line) { if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue; [$k,$v]=explode('=', $line, 2); if (getenv(trim($k))===false) putenv(trim($k).'='.trim($v, " \t\"'")); }
return [
  'agent_name' => getenv('CRABASE_AGENT_NAME') ?: 'Crab',
  'workspace_root' => getenv('CRABASE_WORKSPACE_ROOT') ?: dirname(__DIR__, 3),
];
