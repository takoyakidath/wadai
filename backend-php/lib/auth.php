<?php
declare(strict_types=1);

const WADAI_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12時間

function wadai_create_session(PDO $pdo, int $adminId): array
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + WADAI_SESSION_TTL_SECONDS);

    $pdo->prepare('INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (:admin_id, :token, :expires_at)')
        ->execute([':admin_id' => $adminId, ':token' => $token, ':expires_at' => $expiresAt]);

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

function wadai_bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $m) === 1) {
        return trim($m[1]);
    }
    return null;
}

/** トークンが無効・期限切れなら 401 を返して終了する。有効なら admin_id を返す。 */
function wadai_require_admin(PDO $pdo): int
{
    $token = wadai_bearer_token();
    if ($token === null) {
        wadai_error('unauthorized', 'ログインが必要です。', 401);
    }

    $stmt = $pdo->prepare(
        'SELECT admin_id FROM admin_sessions WHERE token = :token AND expires_at > NOW()'
    );
    $stmt->execute([':token' => $token]);
    $row = $stmt->fetch();

    if ($row === false) {
        wadai_error('unauthorized', 'セッションの期限が切れています。再度ログインしてください。', 401);
    }

    return (int) $row['admin_id'];
}

function wadai_invalidate_session(PDO $pdo, string $token): void
{
    $pdo->prepare('DELETE FROM admin_sessions WHERE token = :token')->execute([':token' => $token]);
}
