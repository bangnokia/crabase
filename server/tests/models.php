<?php
require dirname(__DIR__) . '/vendor/autoload.php';
use app\service\Store as S;
use app\service\Actions as A;
$path = tempnam(sys_get_temp_dir(), 'crabase-models-');
putenv('CRABASE_DB='.$path);
function check(bool $ok): void { if (!$ok) throw new RuntimeException('Model selection check failed.'); }
try {
    $process = proc_open([PHP_BINARY, dirname(__DIR__).'/vendor/bin/phinx', 'migrate', '-c', dirname(__DIR__).'/phinx.php'], [0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>STDERR], $pipes);
    check(is_resource($process) && proc_close($process) === 0);
    S::db();
    S::run('INSERT INTO projects VALUES (?,?,?)', ['test', 'Test', dirname(__DIR__, 2)]);
    $project = S::all('SELECT id FROM projects LIMIT 1')[0]['id'];
    check(S::snapshot()['projects'][0]['created_order'] === 1);
    check(array_key_exists('branch', A::handle('projectContext', ['project_id'=>$project])));
    try { A::handle('projectContext', ['project_id'=>'missing']); throw new RuntimeException('Missing project accepted'); }
    catch (InvalidArgumentException) {}
    $users = array_column(\app\model\User::all()->toArray(), 'id', 'name');
    S::run('INSERT INTO users VALUES (?,?,?,?)', ['named-user','Name, with comma','',gmdate('c')]);
    $users['Name, with comma'] = 'named-user';
    $models = [['model'=>'test-model','defaultReasoningEffort'=>'low','supportedReasoningEfforts'=>[['reasoningEffort'=>'low'],['reasoningEffort'=>'high']]]];
    S::run("INSERT INTO settings VALUES ('models',?)", [json_encode($models)]);
    $chat = A::handle('create', ['title'=>'Queue options'])['id'];
    foreach (['high','low'] as $effort) A::handle('message', ['chat_id'=>$chat,'body'=>'test','user_id'=>$users['user1'],'mode'=>'agent','model'=>'test-model','effort'=>$effort]);
    check(S::all('SELECT model,effort FROM jobs ORDER BY id') === [['model'=>'test-model','effort'=>'high'],['model'=>'test-model','effort'=>'low']]);
    check(A::agentOptions(['model'=>'test-model']) === ['model'=>'test-model','effort'=>'low']);
    foreach ([['model'=>'missing'],['model'=>'test-model','effort'=>'invalid'],['effort'=>'low']] as $bad) {
        try { A::handle('message',array_merge(['chat_id'=>$chat,'body'=>'invalid','mode'=>'agent'],$bad)); throw new RuntimeException('Invalid settings accepted'); }
        catch (InvalidArgumentException) {}
    }
    check(count(S::all('SELECT * FROM messages WHERE chat_id=?',[$chat])) === 2);
    $participantsChat = A::handle('create', ['title'=>'Participant check'])['id'];
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'note','mode'=>'note','user_id'=>$users['user1']]);
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'another note','mode'=>'note','user_id'=>$users['user1']]);
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'note','mode'=>'note','user_id'=>$users['Name, with comma']]);
    S::run('INSERT INTO messages (chat_id,role,author,body,created_at) VALUES (?,?,?,?,?)', [$participantsChat,'assistant','Crab','hello',gmdate('c')]);
    $participants = array_column(S::snapshot()['chats'], 'participants', 'id')[$participantsChat];
    check($participants === ['user1','Name, with comma']);
    $user = \app\model\User::find($users['user1']);
    check($user->messages()->where('chat_id', $chat)->count() === 2);
    check(\app\model\Chat::find($chat)->jobs()->count() === 2);
    check(\app\model\Message::where('chat_id', $chat)->first()->user->id === $user->id);
    A::handle('userAvatar', ['user_id'=>$user->id,'avatar_url'=>'https://example.com/avatar.png']);
    check($user->fresh()->avatar_url === 'https://example.com/avatar.png');
    foreach ([['user_id'=>'missing','avatar_url'=>'https://example.com/a.png'], ['user_id'=>$user->id,'avatar_url'=>'javascript:alert(1)']] as $bad) {
        try { A::handle('userAvatar', $bad); throw new RuntimeException('Invalid profile accepted'); } catch (InvalidArgumentException) {}
    }
    try { A::handle('message', ['chat_id'=>$chat,'body'=>'spoof','user_id'=>'missing']); throw new RuntimeException('Unknown user accepted'); } catch (InvalidArgumentException) {}
    try {
        \support\Db::transaction(function () use ($user) {
            $user->update(['avatar_url'=>'https://example.com/rollback.png']);
            S::run('UPDATE users SET name=? WHERE id=?', ['rollback-name', $user->id]);
            throw new RuntimeException('rollback test');
        });
    } catch (RuntimeException) {}
    check($user->fresh()->name === 'user1' && $user->fresh()->avatar_url === 'https://example.com/avatar.png');
    $workspace = sys_get_temp_dir().'/crabase-project-'.bin2hex(random_bytes(8));
    $previousRoot = getenv('CRABASE_WORKSPACE_ROOT');
    mkdir($workspace); mkdir($workspace.'/Folder name');
    putenv('CRABASE_WORKSPACE_ROOT='.$workspace);
    try {
        $opened = A::handle('project', ['path'=>$workspace.'/Folder name', 'name'=>'Ignored custom name']);
        check(\app\model\Project::find($opened['id'])->name === 'Folder name');
        check(A::handle('project', ['path'=>$workspace.'/Folder name'])['id'] === $opened['id']);
    } finally {
        rmdir($workspace.'/Folder name'); rmdir($workspace);
        putenv($previousRoot === false ? 'CRABASE_WORKSPACE_ROOT' : 'CRABASE_WORKSPACE_ROOT='.$previousRoot);
    }
    echo "PASS: model/effort validation, defaults, immutable queued selections, and rejection before saving.\n";
} finally {
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) unlink($file);
}
