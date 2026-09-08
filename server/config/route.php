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
Route::disableDefaultRoute();
