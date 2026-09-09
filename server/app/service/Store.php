<?php

namespace app\service;

use PDO;
use InvalidArgumentException;
use app\model\{Chat, Message, Approval, Project, Event, Setting, User};

final class Store
{
    public static function db(): PDO
    {
        if (!config('database')) {
            \Webman\Config::load(dirname(__DIR__, 2).'/config', ['route']);
        }
        $db = \support\Db::connection()->getPdo();
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
        if (!$db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='phinxlog'")->fetchColumn()) {
            throw new \RuntimeException('Database needs migrations. Run: cd server && vendor/bin/phinx migrate');
        }
        return $db;
    }

    public static function all(string $sql, array $args = []): array
    {
        $s = self::db()->prepare($sql);
        $s->execute($args);
        return $s->fetchAll();
    }
    public static function run(string $sql, array $args = [], bool $notify = true): void
    {
        $s = self::db()->prepare($sql);
        $s->execute($args);
        if ($s->rowCount() && $notify) {
            self::notify();
        }
    }
    public static function notify(): void
    {
        self::db()->exec("INSERT INTO settings VALUES ('revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1");
    }
    public static function text(mixed $value, int $max = 20000): string
    {
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) {
            throw new InvalidArgumentException("Enter between 1 and $max characters.");
        }
        return trim($value);
    }
    public static function event(?string $chat, string $label): void
    {
        self::db();
        Event::query()->create(['chat_id' => $chat, 'label' => $label, 'created_at' => gmdate('c')]);
        self::notify();
    }
    public static function thread(string $id): array
    {
        self::db();
        $chat = Chat::query()->find($id)?->toArray();
        if (!$chat) {
            throw new InvalidArgumentException('Conversation not found.');
        }
        return ['artifacts' => Artifacts::listing($id), 'chat' => $chat, 'messages' => Message::query()->where('chat_id', $id)->orderBy('id')->get()->toArray(), 'approvals' => Approval::query()->where('chat_id', $id)->whereNull('decision')->get()->toArray()];
    }
    public static function agentName(): string
    {
        $config = require dirname(__DIR__, 2).'/config/crabase.php';
        return trim((string)$config['agent_name']) ?: 'Crab';
    }
    public static function snapshot(): array
    {
        $chats = self::all("SELECT c.*, p.name AS project_name,
            (SELECT json_group_array(DISTINCT author) FROM messages m WHERE m.chat_id=c.id AND m.role IN ('user','note')) AS participants
            FROM chats c LEFT JOIN projects p ON p.id=c.project_id ORDER BY updated_at DESC, c.rowid DESC");
        foreach ($chats as &$chat) {
            $chat['participants'] = json_decode($chat['participants'], true);
        }
        unset($chat);
        $users = self::all('SELECT u.id,u.name,u.avatar_url,u.created_at,a.email FROM users u LEFT JOIN accounts a ON a.user_id=u.id ORDER BY u.name');
        foreach ($users as &$user) {
            if (!$user['avatar_url'] && $user['email']) $user['avatar_url'] = Auth::avatar($user['email']);
            unset($user['email']);
        }
        unset($user);
        return [
            'users' => $users,
            'agentName' => self::agentName(),
            'models' => json_decode(Setting::query()->whereKey('models')->value('value') ?? '[]', true),
            'projects' => self::all('SELECT *, rowid AS created_order FROM projects'),
            'chats' => $chats,
            'events' => self::all('SELECT e.*, c.title FROM events e LEFT JOIN chats c ON c.id=e.chat_id ORDER BY e.id DESC LIMIT 50'),
            'runtime' => Setting::query()->whereKey('runtime')->value('value') ?? 'offline',
        ];
    }
}
