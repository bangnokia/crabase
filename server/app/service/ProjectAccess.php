<?php
namespace app\service;

use app\model\{Project, Chat, Account};
use InvalidArgumentException;

final class ProjectAccess
{
    public static function ids(array $actor): array
    {
        if ($actor['admin']) return Project::query()->pluck('id')->all();
        $roots = Project::query()->whereNull('parent_id')->where(function ($query) use ($actor) {
            $query->where('visibility', 'public')->orWhereHas('members', fn($members) => $members->where('users.id', $actor['id']));
        })->pluck('id')->all();
        return Project::query()->whereIn('id', $roots)->orWhereIn('parent_id', $roots)->pluck('id')->all();
    }

    public static function project(array $actor, string $id): void
    {
        if (!in_array($id, self::ids($actor), true)) throw new InvalidArgumentException('Project not found or access denied.');
    }

    public static function canChat(array $actor, string $id): bool
    {
        $chat = Chat::query()->find($id);
        return $chat && (!$chat->project_id || in_array($chat->project_id, self::ids($actor), true));
    }

    public static function chat(array $actor, string $id): void
    {
        if (!self::canChat($actor, $id)) throw new InvalidArgumentException('Chat not found or access denied.');
    }

    public static function snapshot(array $state, array $actor): array
    {
        $ids = self::ids($actor);
        $state['projects'] = array_values(array_filter($state['projects'], fn($project) => in_array($project['id'], $ids, true)));
        $state['chats'] = array_values(array_filter($state['chats'], fn($chat) => !$chat['project_id'] || in_array($chat['project_id'], $ids, true)));
        $chatIds = array_column($state['chats'], 'id');
        // Global events can contain private project names; only admins receive them.
        $state['events'] = array_values(array_filter($state['events'], fn($event) => $event['chat_id'] ? in_array($event['chat_id'], $chatIds, true) : (bool)$actor['admin']));
        return $state;
    }

    public static function sharing(array $actor, array $data, bool $save): array
    {
        if (!$actor['admin']) throw new InvalidArgumentException('Administrator access required.');
        $project = Project::query()->find(Store::text($data['project_id'] ?? null, 64)) ?? throw new InvalidArgumentException('Project not found.');
        if ($project->parent_id) throw new InvalidArgumentException('Manage sharing on the original project.');
        if ($save) {
            $visibility = $data['visibility'] ?? null;
            $members = $data['members'] ?? null;
            if (!in_array($visibility, ['private', 'public'], true) || !is_array($members) || !array_is_list($members) || count($members) > 1000) throw new InvalidArgumentException('Invalid sharing settings.');
            foreach ($members as $id) Store::text($id, 64);
            $members = array_values(array_unique($members));
            if (Account::query()->where('enabled', 1)->whereIn('user_id', $members)->count() !== count($members)) throw new InvalidArgumentException('Select enabled users only.');
            \support\Db::transaction(function () use ($project, $visibility, $members) {
                $project->update(['visibility'=>$visibility]);
                $project->members()->sync($visibility === 'private' ? $members : []);
                Store::notify();
            });
        }
        return ['visibility'=>$project->visibility, 'members'=>$project->members()->pluck('users.id')->all()];
    }
}
