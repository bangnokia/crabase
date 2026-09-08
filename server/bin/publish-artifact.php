<?php
require dirname(__DIR__).'/vendor/autoload.php';
try {
    if ($argc !== 3) throw new InvalidArgumentException('Usage: php publish-artifact.php CHAT_ID ABSOLUTE_FILE_PATH');
    $file = \app\service\Artifacts::publish($argv[1], $argv[2]);
    \app\service\Store::run("INSERT INTO settings VALUES ('revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [bin2hex(random_bytes(16))]);
    echo json_encode($file, JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage()."\n");
    exit(1);
}
