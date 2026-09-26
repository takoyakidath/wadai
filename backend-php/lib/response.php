<?php
declare(strict_types=1);

function wadai_send_cors_headers(): void
{
    $allowed = wadai_env('CORS_ALLOWED_ORIGIN', '');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($allowed !== '' && $origin !== '') {
        $allowedList = array_map('trim', explode(',', $allowed));
        if (in_array($origin, $allowedList, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Vary: Origin');
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

function wadai_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wadai_error(string $error, string $message, int $status): never
{
    wadai_json(['error' => $error, 'message' => $message], $status);
}

function wadai_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
