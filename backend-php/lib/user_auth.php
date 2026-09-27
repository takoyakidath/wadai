<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php'; // wadai_bearer_token() を共有

const WADAI_USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30日（一般ユーザーなので管理者より長め）

function wadai_create_user_session(PDO $pdo, int $userId): array
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + WADAI_USER_SESSION_TTL_SECONDS);

    $pdo->prepare('INSERT INTO user_sessions (user_id, token, expires_at) VALUES (:user_id, :token, :expires_at)')
        ->execute([':user_id' => $userId, ':token' => $token, ':expires_at' => $expiresAt]);

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

/** トークンが無効・期限切れなら 401 を返して終了する。有効なら user_id を返す。 */
function wadai_require_user(PDO $pdo): int
{
    $token = wadai_bearer_token();
    if ($token === null) {
        wadai_error('unauthorized', 'ログインが必要です。', 401);
    }

    $stmt = $pdo->prepare(
        'SELECT user_id FROM user_sessions WHERE token = :token AND expires_at > NOW()'
    );
    $stmt->execute([':token' => $token]);
    $row = $stmt->fetch();

    if ($row === false) {
        wadai_error('unauthorized', 'セッションの期限が切れています。再度ログインしてください。', 401);
    }

    return (int) $row['user_id'];
}

function wadai_invalidate_user_session(PDO $pdo, string $token): void
{
    $pdo->prepare('DELETE FROM user_sessions WHERE token = :token')->execute([':token' => $token]);
}
