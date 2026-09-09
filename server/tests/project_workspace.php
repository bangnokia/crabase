<?php
require dirname(__DIR__).'/vendor/autoload.php';
use app\service\{ProjectWorkspace as W, Store as S};

$root = sys_get_temp_dir().'/crabase-code-'.bin2hex(random_bytes(8));
$db = tempnam(sys_get_temp_dir(), 'crabase-code-db-');
mkdir($root, 0700); mkdir($root.'/project'); mkdir($root.'/outside');
putenv('CRABASE_WORKSPACE_ROOT='.$root); putenv('CRABASE_DB='.$db);
function workspaceCheck(bool $ok): void { if (!$ok) throw new RuntimeException('Project workspace check failed.'); }
function command(array $args, string $cwd): void {
    $process = proc_open($args, [0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>STDERR], $pipes, $cwd);
    workspaceCheck(is_resource($process) && proc_close($process) === 0);
}
try {
    command([PHP_BINARY, dirname(__DIR__).'/vendor/bin/phinx', 'migrate', '-c', dirname(__DIR__).'/phinx.php'], dirname(__DIR__));
    command(['git','init','--quiet'], $root.'/project');
    command(['git','config','user.email','test@example.com'], $root.'/project');
    command(['git','config','user.name','Test'], $root.'/project');
    file_put_contents($root.'/project/readme.md', "before\n");
    command(['git','add','readme.md'], $root.'/project');
    command(['git','commit','--quiet','-m','Initial'], $root.'/project');
    file_put_contents($root.'/project/readme.md', "after\n");
    file_put_contents($root.'/project/new.php', "<?php echo 'new';\n");
    S::run('INSERT INTO projects VALUES (?,?,?)', ['project', 'Project', $root.'/project']);
    $data = ['project_id'=>'project'];
    $snapshot = W::snapshot($data);
    workspaceCheck($snapshot['git'] === true);
    workspaceCheck($snapshot['paths'] === ['new.php','readme.md']);
    workspaceCheck(array_column($snapshot['changes'], 'status', 'path') === ['new.php'=>'untracked','readme.md'=>'modified']);
    $file = W::file($data + ['path'=>'readme.md']);
    workspaceCheck($file['contents'] === "after\n" && strlen($file['hash']) === 64);
    workspaceCheck(str_contains(W::diff($data + ['path'=>'readme.md'])['patch'], '+after'));
    workspaceCheck(str_contains(W::diff($data + ['path'=>'new.php'])['patch'], "+<?php echo 'new';"));
    $saved = W::save($data + ['path'=>'readme.md','contents'=>"saved\n",'hash'=>$file['hash']]);
    workspaceCheck(file_get_contents($root.'/project/readme.md') === "saved\n" && strlen($saved['hash']) === 64);
    try { W::save($data + ['path'=>'readme.md','contents'=>'stale','hash'=>$file['hash']]); throw new RuntimeException('Stale write accepted.'); }
    catch (InvalidArgumentException) {}
    symlink($root.'/outside', $root.'/project/escape');
    foreach (['../outside/file', '/etc/passwd', 'escape/file'] as $path) {
        try { W::file($data + ['path'=>$path]); throw new RuntimeException('Invalid path accepted.'); }
        catch (InvalidArgumentException) {}
    }
    echo "PASS: project file listing, Git status and diffs, text previews, and path boundaries.\n";
} finally {
    if (is_link($root.'/project/escape')) unlink($root.'/project/escape');
    foreach ([$root.'/project/new.php',$root.'/project/readme.md'] as $file) if (is_file($file)) unlink($file);
    $git = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/project/.git', FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($git as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    if (is_dir($root.'/project/.git')) rmdir($root.'/project/.git');
    rmdir($root.'/project'); rmdir($root.'/outside'); rmdir($root);
    foreach ([$db,$db.'-wal',$db.'-shm'] as $file) if (is_file($file)) unlink($file);
}
