<?php
declare(strict_types=1);

// ロリポップの cron から1日1回叩く: php /home/.../backend-php/cron/retry_webhooks.php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/discord.php';

$pdo = wadai_db();

$stmt = $pdo->query(
    'SELECT s.id, s.body, s.flagged, s.created_at, c.label AS category_label
     FROM submissions s LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.webhook_notified_at IS NULL AND s.status = "pending"'
);

$adminBase = wadai_env('ADMIN_BASE_URL', '');
$retried = 0;
$succeeded = 0;

foreach ($stmt->fetchAll() as $submission) {
    $retried++;
    $createdAtJst = (new DateTimeImmutable($submission['created_at'], new DateTimeZone('UTC')))
        ->setTimezone(new DateTimeZone('Asia/Tokyo'))
        ->format('Y-m-d H:i');
    $adminUrl = rtrim($adminBase, '/') . "/submissions/{$submission['id']}";

    $notified = wadai_notify_discord_new_submission(
        (string) $submission['id'],
        $submission['body'],
        $submission['category_label'] ?? '',
        $createdAtJst,
        $adminUrl,
        (bool) $submission['flagged']
    );

    if ($notified) {
        $pdo->prepare('UPDATE submissions SET webhook_notified_at = NOW() WHERE id = :id')
            ->execute([':id' => $submission['id']]);
        $succeeded++;
    }
}

echo "Retried {$retried}, succeeded {$succeeded}.\n";
