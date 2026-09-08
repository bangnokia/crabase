<?php
require dirname(__DIR__) . '/vendor/autoload.php';
use app\service\Store as S;
use app\service\Actions as A;
$path = tempnam(sys_get_temp_dir(), 'crabase-models-');
putenv('CRABASE_DB='.$path);
function check(bool $ok): void { if (!$ok) throw new RuntimeException('Model selection check failed.'); }
try {
    S::db();
    $project = S::all('SELECT id FROM projects LIMIT 1')[0]['id'];
    check(array_key_exists('branch', A::handle('projectContext', ['project_id'=>$project])));
    try { A::handle('projectContext', ['project_id'=>'missing']); throw new RuntimeException('Missing project accepted'); }
    catch (InvalidArgumentException) {}
    $models = [['model'=>'test-model','defaultReasoningEffort'=>'low','supportedReasoningEfforts'=>[['reasoningEffort'=>'low'],['reasoningEffort'=>'high']]]];
    S::run("INSERT INTO settings VALUES ('models',?)", [json_encode($models)]);
    $chat = A::handle('create', ['title'=>'Queue options'])['id'];
    foreach (['high','low'] as $effort) A::handle('message', ['chat_id'=>$chat,'body'=>'test','mode'=>'agent','model'=>'test-model','effort'=>$effort]);
    check(S::all('SELECT model,effort FROM jobs ORDER BY id') === [['model'=>'test-model','effort'=>'high'],['model'=>'test-model','effort'=>'low']]);
    check(A::agentOptions(['model'=>'test-model']) === ['model'=>'test-model','effort'=>'low']);
    foreach ([['model'=>'missing'],['model'=>'test-model','effort'=>'invalid'],['effort'=>'low']] as $bad) {
        try { A::handle('message',array_merge(['chat_id'=>$chat,'body'=>'invalid','mode'=>'agent'],$bad)); throw new RuntimeException('Invalid settings accepted'); }
        catch (InvalidArgumentException) {}
    }
    check(count(S::all('SELECT * FROM messages WHERE chat_id=?',[$chat])) === 2);
    $participantsChat = A::handle('create', ['title'=>'Participant check'])['id'];
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'note','mode'=>'note','author'=>'user1']);
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'another note','mode'=>'note','author'=>'user1']);
    A::handle('message', ['chat_id'=>$participantsChat,'body'=>'note','mode'=>'note','author'=>'Name, with comma']);
    S::run('INSERT INTO messages (chat_id,role,author,body,created_at) VALUES (?,?,?,?,?)', [$participantsChat,'assistant','Crab','hello',gmdate('c')]);
    $participants = array_column(S::snapshot()['chats'], 'participants', 'id')[$participantsChat];
    check($participants === ['user1','Name, with comma']);
    echo "PASS: model/effort validation, defaults, immutable queued selections, and rejection before saving.\n";
} finally {
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) unlink($file);
}
