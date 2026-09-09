<?php

namespace app\service;

use InvalidArgumentException;
use app\model\{User, Project, Chat, Message, Job, Approval, Event, Setting};

final class Actions
{
    public static function agentOptions(array $data): array
    {
        $model = $data['model'] ?? null;
        $effort = $data['effort'] ?? null;
        if ($model === null) {
            if ($effort !== null) {
                throw new InvalidArgumentException('Select a model before choosing reasoning.');
            }
            return ['model' => null,'effort' => null];
        }
        $model = Store::text($model, 200);
        $models = json_decode(Setting::query()->whereKey('models')->value('value') ?? '[]', true);
        $selected = array_values(array_filter($models, fn ($entry) => $entry['model'] === $model))[0] ?? null;
        if (!$selected) {
            throw new InvalidArgumentException('This model is not in the current Codex catalog. Refresh the model list.');
        }
        $efforts = array_column($selected['supportedReasoningEfforts'], 'reasoningEffort');
        if (!$efforts) {
            if ($effort !== null) {
                throw new InvalidArgumentException('This model does not offer reasoning levels.');
            }
            return ['model' => $model,'effort' => null];
        }
        $effort ??= $selected['defaultReasoningEffort'] ?? null;
        if ($effort !== null && !in_array($effort, $efforts, true)) {
            throw new InvalidArgumentException('This reasoning level is not supported by the selected model.');
        }
        return ['model' => $model,'effort' => $effort];
    }
    public static function handle(string $action, array $data): array
    {
        Store::db();
        $result = match ($action) {
            'projectFolders' => WorkspaceFolders::listing($data),
            'projectContext' => self::projectContext($data),
            'projectWorkspace' => ProjectWorkspace::snapshot($data),
            'projectFile' => ProjectWorkspace::file($data),
            'projectDiff' => ProjectWorkspace::diff($data),
            'projectSave' => ProjectWorkspace::save($data),
            'project' => self::createProject($data),
            'create' => self::createChat($data),
            'message' => self::sendMessage($data),
            'archive' => self::archiveChat($data),
            'cancel' => self::cancelJobs($data),
            'approval' => self::decideApproval($data),
            'userAvatar' => self::updateUserAvatar($data),
            default => throw new InvalidArgumentException('Unknown action.'),
        };
        if (!in_array($action, ['projectContext', 'projectFolders', 'projectWorkspace', 'projectFile', 'projectDiff'], true)) {
            Store::notify();
        }
        return $result;
    }

    public static function projectContext(array $data): array
    {
        $id = Store::text($data['project_id'] ?? null, 64);
        $project = Project::query()->find($id);
        if (!$project) {
            throw new InvalidArgumentException('Project not found.');
        }
        $process = proc_open(['git','-C',$project['path'],'symbolic-ref','--quiet','--short','HEAD'], [0 => ['file','/dev/null','r'],1 => ['pipe','w'],2 => ['file','/dev/null','w']], $pipes);
        if (!is_resource($process)) {
            return ['branch' => null];
        }
        $branch = trim(stream_get_contents($pipes[1]));
        fclose($pipes[1]);
        return ['branch' => proc_close($process) === 0 && $branch !== '' ? $branch : null];
    }


    public static function createProject(array $data): array
    {
        $path = WorkspaceFolders::resolve($data['path'] ?? null);
        $name = basename($path);
        $existing = Project::query()->where('path', $path)->first();
        if ($existing) return ['id'=>$existing->id];
        $id = bin2hex(random_bytes(8));
        Project::query()->create(['id' => $id, 'name' => $name, 'path' => $path]);
        Store::event(null, "Added project $name");
        return ['id' => $id];
    }

    public static function createChat(array $data): array
    {
        $project = empty($data['project_id']) ? null : Store::text($data['project_id'], 64);
        if ($project !== null && !Project::query()->whereKey($project)->exists()) {
            throw new InvalidArgumentException('Project not found.');
        }
        $id = bin2hex(random_bytes(8));
        $now = gmdate('c');
        Chat::query()->create([
            'id' => $id, 'project_id' => $project,
            'title' => Store::text($data['title'] ?? 'New chat', 160),
            'created_at' => $now, 'updated_at' => $now,
        ]);
        Store::event($id, 'Started a new thread');
        return ['id' => $id];
    }


    public static function sendMessage(array $data): array
    {
        $chat = Chat::query()->find(Store::text($data['chat_id'] ?? null, 64)) ?? throw new InvalidArgumentException('Conversation not found.');
        $id = $chat['id'];
        $body = Store::text($data['body'] ?? null);
        $user = User::query()->find(Store::text($data['user_id'] ?? null, 64)) ?? throw new InvalidArgumentException('User not found.');
        $author = $user['name'];
        $mode = $data['mode'] ?? 'note';
        if (!in_array($mode, ['note','agent'])) {
            throw new InvalidArgumentException('Unknown message mode.');
        }
        if ($chat['archived']) {
            throw new InvalidArgumentException('Restore this thread before sending a message.');
        }
        $options = $mode === 'agent' ? self::agentOptions($data) : ['model' => null,'effort' => null];
        \support\Db::transaction(function () use ($chat, $id, $body, $user, $author, $mode, $options) {
            $message = Message::query()->create([
                'chat_id' => $id, 'role' => $mode === 'note' ? 'note' : 'user',
                'author' => $author, 'body' => $body, 'created_at' => gmdate('c'), 'user_id' => $user->id,
            ]);
            $chat->update(['updated_at' => gmdate('c')]);
            if ($mode === 'agent') {
                Job::query()->create(['chat_id' => $id, 'prompt' => $body, 'model' => $options['model'], 'effort' => $options['effort'], 'message_id'=>$message->id]);
                Chat::query()->whereKey($id)->where('status', 'idle')->update(['status' => 'queued']);
            }
            Store::event($id, $author . ($mode === 'agent' ? ' asked '.Store::agentName() : ' added a note'));
        });
        return ['ok' => true];
    }

    public static function archiveChat(array $data): array
    {
        $chat = Chat::query()->find(Store::text($data['chat_id'] ?? null, 64)) ?? throw new InvalidArgumentException('Conversation not found.');
        $id = $chat['id'];
        if ($chat['status'] !== 'idle') {
            throw new InvalidArgumentException('Stop the active work before archiving.');
        }
        $chat->update(['archived' => empty($data['archived']) ? 0 : 1]);
        return ['ok' => true];
    }

    public static function cancelJobs(array $data): array
    {
        $chat = Chat::query()->find(Store::text($data['chat_id'] ?? null, 64)) ?? throw new InvalidArgumentException('Conversation not found.');
        $id = $chat['id'];
        Job::query()->where('chat_id', $id)->whereIn('status', ['queued','running'])->update(['cancel' => 1]);
        return ['ok' => true];
    }

    public static function decideApproval(array $data): array
    {
        $chat = Chat::query()->find(Store::text($data['chat_id'] ?? null, 64)) ?? throw new InvalidArgumentException('Conversation not found.');
        $id = $chat['id'];
        if (!in_array($data['decision'] ?? '', ['accept','decline'])) {
            throw new InvalidArgumentException('Invalid approval decision.');
        }
        Approval::query()->whereKey($data['approval_id'] ?? 0)->where('chat_id', $id)->whereNull('decision')->update(['decision' => $data['decision']]);
        Store::event($id, $data['decision'] === 'accept' ? 'Approved an agent action' : 'Declined an agent action');
        return ['ok' => true];
    }

    public static function updateUserAvatar(array $data): array
    {
        $user = User::query()->find(Store::text($data['user_id'] ?? null, 64)) ?? throw new InvalidArgumentException('User not found.');
        $url = Store::text($data['avatar_url'] ?? null, 4096);
        if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($url, PHP_URL_SCHEME) ?: ''), ['http','https'], true)) {
            throw new InvalidArgumentException('Enter an HTTP or HTTPS image URL.');
        }
        $user->update(['avatar_url' => $url]);
        return ['ok' => true];
    }
}
