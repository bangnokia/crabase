<?php
use Webman\Route;
Route::get('/', function () {
    $index = public_path() . '/index.html';
    return is_file($index) ? response(file_get_contents($index))->header('Content-Type', 'text/html; charset=utf-8') : response('Build the frontend with npm run build, or open http://127.0.0.1:5173 during development.');
});
Route::get('/chat/{id}', function () {
    $index = public_path() . '/index.html';
    return is_file($index) ? response(file_get_contents($index))->header('Content-Type', 'text/html; charset=utf-8') : response('Build the frontend first.');
});
Route::get('/files/{chatId}/{name}', function (\support\Request $request, string $chatId, string $name) {
    if (!in_array(explode(':', $request->host())[0], ['localhost','127.0.0.1'], true) || $request->header('sec-fetch-site') === 'cross-site') return response('Forbidden', 403);
    $file = \app\service\Artifacts::resolve($chatId, $name);
    if (!$file) return response('Output file not found.', 404);
    $inline = !$request->get('download') && in_array($file['mime'], ['image/png','image/jpeg','image/gif','image/webp','image/avif'], true);
    return response()->file($file['path'])->withHeaders([
        'Content-Type'=>$file['mime'],
        'Content-Disposition'=>($inline ? 'inline' : 'attachment')."; filename*=UTF-8''".rawurlencode($file['name']),
        'X-Content-Type-Options'=>'nosniff',
        'Content-Security-Policy'=>"sandbox; default-src 'none'",
        'Cache-Control'=>'private, no-store',
        'Cross-Origin-Resource-Policy'=>'same-origin',
    ]);
});
Route::disableDefaultRoute();
