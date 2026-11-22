<?php
// SLM After-Sales photo store. Upload this file to your cPanel hosting (see README "Photo storage").
// Photos are saved in ./slm-photo-data/ which is closed to the public; only this script (with the secret) can read them.

const SECRET = 'CHANGE_ME_TO_THE_PHOTO_SECRET';
const MAX_BYTES = 10 * 1024 * 1024;

header('Cache-Control: no-store');

if (!hash_equals(SECRET, $_SERVER['HTTP_X_PHOTO_SECRET'] ?? '')) {
    http_response_code(403);
    exit('forbidden');
}

$id = $_GET['id'] ?? '';
if (!preg_match('/^[A-Za-z0-9_-]{4,64}$/', $id)) {
    http_response_code(400);
    exit('bad id');
}

$dir = __DIR__ . '/slm-photo-data';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
    file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
}
$file = $dir . '/' . $id . '.jpg';
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'put' && $method === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === '' || strlen($body) > MAX_BYTES || @getimagesizefromstring($body) === false) {
        http_response_code(400);
        exit('not an image');
    }
    file_put_contents($file, $body);
    echo 'ok';
} elseif ($action === 'get' && $method === 'GET') {
    if (!is_file($file)) {
        http_response_code(404);
        exit('missing');
    }
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($file));
    readfile($file);
} elseif ($action === 'delete' && $method === 'POST') {
    if (is_file($file)) {
        unlink($file);
    }
    echo 'ok';
} else {
    http_response_code(400);
    echo 'bad request';
}
