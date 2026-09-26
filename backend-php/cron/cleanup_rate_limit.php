<?php
declare(strict_types=1);

// ロリポップの cron から1日1回叩く: php /home/.../backend-php/cron/cleanup_rate_limit.php
require_once __DIR__ . '/../config.php';

$pdo = wadai_db();
$deleted = $pdo->exec('DELETE FROM rate_limit_hits WHERE created_at < NOW() - INTERVAL 1 DAY');
echo "Deleted {$deleted} old rate_limit_hits rows.\n";
