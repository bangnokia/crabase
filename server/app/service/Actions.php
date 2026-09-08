<?php
namespace app\service;
use app\service\Store as S;
use InvalidArgumentException;

final class Actions
{
    public static function agentOptions(array $data): array
    {
        $model = $data['model'] ?? null;
        $effort = $data['effort'] ?? null;
        if ($model === null) {
            if ($effort !== null) throw new InvalidArgumentException('Select a model before choosing reasoning.');
            return ['model'=>null,'effort'=>null];
        }
        $model = S::text($model,200);
        $models = json_decode(S::all("SELECT value FROM settings WHERE key='models'")[0]['value'] ?? '[]', true);
        $selected = array_values(array_filter($models, fn($entry) => $entry['model'] === $model))[0] ?? null;
        if (!$selected) throw new InvalidArgumentException('This model is not in the current Codex catalog. Refresh the model list.');
        $efforts = array_column($selected['supportedReasoningEfforts'], 'reasoningEffort');
        if (!$efforts) {
            if ($effort !== null) throw new InvalidArgumentException('This model does not offer reasoning levels.');
            return ['model'=>$model,'effort'=>null];
        }
        $effort ??= $selected['defaultReasoningEffort'] ?? null;
        if ($effort !== null && !in_array($effort,$efforts,true)) throw new InvalidArgumentException('This reasoning level is not supported by the selected model.');
        return ['model'=>$model,'effort'=>$effort];
    }
    public static function handle(string $action, array $data): array
    {
            if ($action === 'project') {
                $name = S::text($data['name'] ?? null, 80);
                $path = realpath(S::text($data['path'] ?? null, 4096));
                if (!$path || !is_dir($path) || !is_readable($path)) throw new InvalidArgumentException('Choose an existing, readable directory on this machine.');
                $root = realpath((require dirname(__DIR__,2).'/config/crabase.php')['workspace_root']);
                if (!$root || ($path !== $root && !str_starts_with($path, $root . DIRECTORY_SEPARATOR))) throw new InvalidArgumentException('Choose a folder inside the configured workspace root.');
                $id = bin2hex(random_bytes(8));
                if (S::all('SELECT id FROM projects WHERE path=?', [$path])) throw new InvalidArgumentException('This directory is already a project.');
                S::run('INSERT INTO projects VALUES (?,?,?)', [$id,$name,$path]);
                S::event(null, "Added project $name");
                return ['id'=>$id];
            }
            if ($action === 'create') {
                $project = empty($data['project_id']) ? null : S::text($data['project_id'], 64);
                if ($project !== null && !S::all('SELECT id FROM projects WHERE id=?', [$project])) throw new InvalidArgumentException('Project not found.');
                $id = bin2hex(random_bytes(8)); $now = gmdate('c');
                S::run('INSERT INTO chats (id,project_id,title,created_at,updated_at) VALUES (?,?,?,?,?)', [$id,$project,S::text($data['title'] ?? 'New thread', 160),$now,$now]);
                S::event($id, 'Started a new thread');
                return ['id'=>$id];
            }
            $id = S::text($data['chat_id'] ?? null, 64);
            $chat = S::all('SELECT * FROM chats WHERE id=?', [$id])[0] ?? null;
            if (!$chat) throw new InvalidArgumentException('Conversation not found.');
            if ($action === 'message') {
                $body = S::text($data['body'] ?? null);
                $author = S::text($data['author'] ?? 'You', 80);
                $mode = $data['mode'] ?? 'note';
                if (!in_array($mode, ['note','agent'])) throw new InvalidArgumentException('Unknown message mode.');
                if ($chat['archived']) throw new InvalidArgumentException('Restore this thread before sending a message.');
                $options = $mode === 'agent' ? self::agentOptions($data) : ['model'=>null,'effort'=>null];
                $db = S::db(); $db->beginTransaction();
                try {
                    S::run('INSERT INTO messages (chat_id,role,author,body,created_at) VALUES (?,?,?,?,?)', [$id,$mode==='note'?'note':'user',$author,$body,gmdate('c')]);
                    S::run('UPDATE chats SET updated_at=? WHERE id=?', [gmdate('c'),$id]);
                    if ($mode === 'agent') {
                        S::run('INSERT INTO jobs (chat_id,prompt,model,effort) VALUES (?,?,?,?)', [$id,$body,$options['model'],$options['effort']]);
                        S::run("UPDATE chats SET status='queued' WHERE id=? AND status='idle'", [$id]);
                    }
                    S::event($id, $author . ($mode === 'agent' ? ' asked '.S::agentName() : ' added a note'));
                    $db->commit();
                } catch (\Throwable $e) { $db->rollBack(); throw $e; }
                return ['ok'=>true];
            }
            if ($action === 'archive') {
                if ($chat['status'] !== 'idle') throw new InvalidArgumentException('Stop the active work before archiving.');
                S::run('UPDATE chats SET archived=? WHERE id=?', [empty($data['archived']) ? 0 : 1,$id]);
                return ['ok'=>true];
            }
            if ($action === 'cancel') {
                S::run('UPDATE jobs SET cancel=1 WHERE chat_id=? AND status IN (\'queued\',\'running\')', [$id]);
                return ['ok'=>true];
            }
            if ($action === 'approval') {
                if (!in_array($data['decision'] ?? '', ['accept','decline'])) throw new InvalidArgumentException('Invalid approval decision.');
                S::run('UPDATE approvals SET decision=? WHERE id=? AND chat_id=? AND decision IS NULL', [$data['decision'],$data['approval_id'] ?? 0,$id]);
                S::event($id, $data['decision'] === 'accept' ? 'Approved an agent action' : 'Declined an agent action');
                return ['ok'=>true];
            }
            throw new InvalidArgumentException('Not found.');
    }
}
