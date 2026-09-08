<?php
require dirname(__DIR__).'/vendor/autoload.php';
use app\service\WorkspaceFolders as F;

$root = sys_get_temp_dir().'/crabase-folders-'.bin2hex(random_bytes(8));
mkdir($root, 0700);
putenv('CRABASE_WORKSPACE_ROOT='.$root);
$outside = $root.'-outside';
mkdir($outside);
function folderCheck(bool $ok): void { if (!$ok) throw new RuntimeException('Folder check failed'); }
try {
    foreach (['Alpha','Beta','Alpha/Nested','.artifacts','.hidden'] as $folder) mkdir($root.'/'.$folder);
    file_put_contents($root.'/plain.txt','not a directory');
    symlink($outside, $root.'/escape');
    $listing = F::listing([]);
    folderCheck(array_column($listing['folders'],'name') === ['Alpha','Beta']);
    folderCheck($listing['parent'] === null);
    $nested = F::listing(['path'=>$root.'/Alpha']);
    folderCheck(array_column($nested['folders'],'name') === ['Nested']);
    folderCheck($nested['parent'] === realpath($root));
    foreach ([$root, $outside, $root.'/escape', $root.'/.artifacts', $root.'/.hidden', $root.'/plain.txt', "bad\0path", $root.'/../'.basename($outside)] as $bad) {
        try { F::resolve($bad); throw new RuntimeException('Invalid folder accepted'); }
        catch (InvalidArgumentException) {}
    }
    folderCheck(F::resolve($root.'/Alpha') === realpath($root.'/Alpha'));
    echo "PASS: workspace folder listing, nesting, hidden paths, root rejection, traversal and symlink boundaries.\n";
} finally {
    unlink($root.'/escape'); unlink($root.'/plain.txt');
    foreach (['Alpha/Nested','Alpha','Beta','.artifacts','.hidden'] as $folder) rmdir($root.'/'.$folder);
    rmdir($root); rmdir($outside);
}
