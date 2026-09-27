<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php'; // wadai_bearer_token() を共有

const WADAI_USER_SESSION_TTL_DAYS = 30; // 一般ユーザーなので管理者より長め

function wadai_create_user_session(PDO $pdo, int $userId): array
{
    $token = bin2hex(random_bytes(32));

    // admin_sessions と同じ理由で、expires_at はMySQL側のNOW()で一貫して計算する。
    $pdo->prepare(
        'INSERT INTO user_sessions (user_id, token, expires_at)
         VALUES (:user_id, :token, NOW() + INTERVAL :ttl_days DAY)'
    )->execute([':user_id' => $userId, ':token' => $token, ':ttl_days' => WADAI_USER_SESSION_TTL_DAYS]);

    $expiresAt = $pdo->query('SELECT NOW() + INTERVAL ' . WADAI_USER_SESSION_TTL_DAYS . ' DAY')->fetchColumn();

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
