<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/env.php';

// .env.local（ローカル開発専用、gitignore対象）があればそちらを優先する。
// .env はロリポップにそのままFTPでアップロードする本番用の値を想定している。
if (is_file(__DIR__ . '/.env.local')) {
    wadai_load_env(__DIR__ . '/.env.local');
} else {
    wadai_load_env(__DIR__ . '/.env');
}

function wadai_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = wadai_env('DB_HOST', 'localhost');
    $name = wadai_env('DB_NAME', 'wadai_dev');
    $user = wadai_env('DB_USER', 'root');
    $pass = wadai_env('DB_PASS', '');

    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
