<?php
declare(strict_types=1);

const WADAI_SESSION_TTL_HOURS = 12;

function wadai_create_session(PDO $pdo, int $adminId): array
{
    $token = bin2hex(random_bytes(32));

    // expires_at は PHP側で計算せず、MySQL側の NOW() で一貫して計算する。
    // PHPとMySQLでタイムゾーン設定がズレていると、作成直後のセッションが
    // 「もう期限切れ」に見えてしまうバグになるため（本番で実際に発生した）。
    $pdo->prepare(
        'INSERT INTO admin_sessions (admin_id, token, expires_at)
         VALUES (:admin_id, :token, NOW() + INTERVAL :ttl_hours HOUR)'
    )->execute([':admin_id' => $adminId, ':token' => $token, ':ttl_hours' => WADAI_SESSION_TTL_HOURS]);

    $expiresAt = $pdo->query('SELECT NOW() + INTERVAL ' . WADAI_SESSION_TTL_HOURS . ' HOUR')->fetchColumn();

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

function wadai_bearer_token(): ?string
{
    // 共用サーバー（Apache+PHP-CGI等）では Authorization ヘッダーが
    // $_SERVER['HTTP_AUTHORIZATION'] に来ず、mod_rewrite 経由だと
    // REDIRECT_HTTP_AUTHORIZATION にリネームされることがある（.htaccess 側でも対策済み）。
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
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
