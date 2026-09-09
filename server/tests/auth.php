<?php
require dirname(__DIR__).'/vendor/autoload.php';
use app\service\{Auth as A, Store as S};
$db = tempnam(sys_get_temp_dir(), 'crabase-auth-');
putenv('CRABASE_DB='.$db);
function authCheck(bool $value): void { if (!$value) throw new RuntimeException('Auth check failed.'); }
function denied(callable $action): void {
    try { $action(); } catch (InvalidArgumentException) { return; }
    throw new RuntimeException('Expected rejection.');
}
try {
    $process = proc_open([PHP_BINARY, dirname(__DIR__).'/vendor/bin/phinx','migrate','-c',dirname(__DIR__).'/phinx.php'], [0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>STDERR], $pipes);
    authCheck(proc_close($process) === 0);
    $id = A::create(['name'=>'Admin','email'=>'admin@example.com','password'=>'test-password'],true)['id'];
    denied(fn () => A::create(['name'=>'Other','email'=>'other@example.com','password'=>'test-password'],true));
    denied(fn () => A::login(['email'=>'admin@example.com','password'=>'wrong'], 'test'));
    $token = A::login(['email'=>'ADMIN@example.com','password'=>'test-password'], 'test');
    $admin = A::user($token);
    authCheck($admin['id'] === $id && !isset($admin['password_hash']));
    authCheck(A::user('bad') === null && A::user(str_repeat('0',64)) === null);
    authCheck(str_starts_with(S::snapshot()['users'][0]['avatar_url'], 'https://www.gravatar.com/avatar/'));
    $memberId = A::create(['name'=>'Member','email'=>'member@example.com','password'=>'test-password'])['id'];
    $memberToken = A::login(['email'=>'member@example.com','password'=>'test-password'], 'test');
    $member = A::user($memberToken);
    denied(fn () => A::users($member));
    denied(fn () => A::update($member, ['id'=>$id],true));
    denied(fn () => A::update($admin, ['id'=>$id,'name'=>'Admin','email'=>'admin@example.com','admin'=>false,'enabled'=>true],true));
    denied(fn () => A::update($member, ['name'=>'Member','email'=>'changed@example.com'],false));
    A::update($member,['name'=>'Member','email'=>'member@example.com','admin'=>true,'git_name'=>'Git Name','git_email'=>'git@example.com'],false);
    authCheck(!A::user($memberToken)['admin']);
    S::run("INSERT INTO chats (id,title,created_at,updated_at) VALUES ('test','Test','now','now')");
    S::run("INSERT INTO messages (chat_id,role,author,body,created_at,user_id) VALUES ('test','user','Member','hi','now',?)",[$memberId]);
    authCheck(str_contains(A::coauthors('test'),'Co-authored-by: Git Name <git@example.com>'));
    denied(fn () => A::update($member,['name'=>'Member','email'=>'member@example.com','git_name'=>"bad\nname",'git_email'=>'git@example.com'],false));
    A::update($admin,['id'=>$memberId,'name'=>'Member','email'=>'member@example.com','enabled'=>false],true);
    authCheck(A::user($memberToken) === null);
    denied(fn () => A::login(['email'=>'member@example.com','password'=>'test-password'],'test'));
    A::logout($token); authCheck(A::user($token) === null);
    $expired = A::login(['email'=>'admin@example.com','password'=>'test-password'],'test');
    S::run('UPDATE auth_sessions SET expires=? WHERE token_hash=?',[time()-1,hash('sha256',$expired)],false);
    authCheck(A::user($expired) === null);
    for ($i=0;$i<10;$i++) denied(fn () => A::login(['email'=>'none@example.com','password'=>'wrong'],'limited'));
    denied(fn () => A::login(['email'=>'admin@example.com','password'=>'test-password'],'limited'));
    echo "PASS: accounts, hashing, sessions, revocation, throttling, roles, last admin, Gravatar and coauthors.\n";
} finally {
    foreach ([$db,$db.'-wal',$db.'-shm'] as $file) if (is_file($file)) unlink($file);
}
