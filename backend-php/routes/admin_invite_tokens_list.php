<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$stmt = $pdo->query(
    'SELECT it.id, it.token, it.expires_at, it.created_at, it.used_at, u.username AS used_by_username
     FROM invite_tokens it LEFT JOIN users u ON u.id = it.used_by
     ORDER BY it.created_at DESC LIMIT 200'
);

$tokens = array_map(function ($row) {
    return [
        'id' => (string) $row['id'],
        'token' => $row['token'],
        'expiresAt' => $row['expires_at'],
        'createdAt' => $row['created_at'],
        'usedAt' => $row['used_at'],
        'usedByUsername' => $row['used_by_username'],
    ];
}, $stmt->fetchAll());

wadai_json(['inviteTokens' => $tokens]);
