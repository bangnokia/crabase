<?php
namespace app\service;

use PDO;
use InvalidArgumentException;

final class Store
{
    private static ?PDO $db = null;

    public static function db(): PDO
    {
        if (self::$db) return self::$db;
        $path = (require dirname(__DIR__, 2).'/config/crabase.php')['database_path'];
        $db = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
        if (!$db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='phinxlog'")->fetchColumn()) {
            throw new \RuntimeException('Database needs migrations. Run: cd server && vendor/bin/phinx migrate');
        }
        self::$db = $db;
        return $db;
    }

    public static function all(string $sql, array $args = []): array { $s = self::db()->prepare($sql); $s->execute($args); return $s->fetchAll(); }
    public static function run(string $sql, array $args = [], bool $notify = true): void {
        $s = self::db()->prepare($sql); $s->execute($args);
        if ($s->rowCount() && $notify) self::db()->exec("INSERT INTO settings VALUES ('revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1");
    }
    public static function text(mixed $value, int $max = 20000): string {
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) throw new InvalidArgumentException("Enter between 1 and $max characters.");
        return trim($value);
    }
    public static function event(?string $chat, string $label): void { self::run('INSERT INTO events (chat_id,label,created_at) VALUES (?,?,?)', [$chat,$label,gmdate('c')]); }
    public static function thread(string $id): array {
        $chat = self::all('SELECT * FROM chats WHERE id=?', [$id])[0] ?? null;
        if (!$chat) throw new InvalidArgumentException('Conversation not found.');
        return ['artifacts'=>Artifacts::listing($id), 'chat'=>$chat, 'messages'=>self::all('SELECT * FROM messages WHERE chat_id=? ORDER BY id', [$id]), 'approvals'=>self::all('SELECT * FROM approvals WHERE chat_id=? AND decision IS NULL', [$id])];
    }
    public static function agentName(): string {
        $config = require dirname(__DIR__,2).'/config/crabase.php';
        return trim((string)$config['agent_name']) ?: 'Crab';
    }
    public static function snapshot(): array {
        $chats = self::all("SELECT c.*, p.name AS project_name,
            (SELECT json_group_array(DISTINCT author) FROM messages m WHERE m.chat_id=c.id AND m.role IN ('user','note')) AS participants
            FROM chats c LEFT JOIN projects p ON p.id=c.project_id ORDER BY updated_at DESC, c.rowid DESC");
        foreach ($chats as &$chat) $chat['participants'] = json_decode($chat['participants'], true);
        unset($chat);
        return [
            'agentName'=>self::agentName(),
            'models'=>json_decode(self::all("SELECT value FROM settings WHERE key='models'")[0]['value'] ?? '[]', true),
            'projects'=>self::all('SELECT * FROM projects ORDER BY name'),
            'chats'=>$chats,
            'events'=>self::all('SELECT e.*, c.title FROM events e LEFT JOIN chats c ON c.id=e.chat_id ORDER BY e.id DESC LIMIT 50'),
            'runtime'=>self::all("SELECT value FROM settings WHERE key='runtime'")[0]['value'] ?? 'offline',
        ];
    }
}
