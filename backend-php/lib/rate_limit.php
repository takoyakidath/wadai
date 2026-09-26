<?php
declare(strict_types=1);

/**
 * Redis が無いロリポップ向けの簡易レート制限（MySQLの小テーブル、§16）。
 * 対象は申請APIのみに絞って書き込み負荷を抑える。古い行は cron/cleanup_rate_limit.php で削除する。
 */
function wadai_check_rate_limit(PDO $pdo, string $bucket, string $ipHash, int $maxHits, int $windowSeconds): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM rate_limit_hits WHERE bucket = :bucket AND ip_hash = :ip_hash AND created_at >= :since'
    );
    $stmt->execute([
        ':bucket' => $bucket,
        ':ip_hash' => $ipHash,
        ':since' => date('Y-m-d H:i:s', time() - $windowSeconds),
    ]);
    $count = (int) $stmt->fetchColumn();

    if ($count >= $maxHits) {
        return false;
    }

    $insert = $pdo->prepare('INSERT INTO rate_limit_hits (bucket, ip_hash) VALUES (:bucket, :ip_hash)');
    $insert->execute([':bucket' => $bucket, ':ip_hash' => $ipHash]);

    return true;
}
