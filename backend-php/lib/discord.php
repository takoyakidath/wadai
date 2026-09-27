<?php
declare(strict_types=1);

function wadai_notify_discord_new_submission(
    string $submissionId,
    string $body,
    string $categoryLabel,
    string $createdAtJst,
    string $adminUrl,
    bool $flagged
): bool {
    $webhookUrl = wadai_env('DISCORD_WEBHOOK_URL', '');
    if ($webhookUrl === '') {
        return false;
    }

    $sanitizedBody = str_replace('```', "'''", $body);

    $payload = [
        'embeds' => [[
            'title' => ($flagged ? '⚠️ ' : '📝 ') . "新しい話題申請 #{$submissionId}",
            'description' => "```{$sanitizedBody}```",
            'fields' => [
                ['name' => 'カテゴリ希望', 'value' => $categoryLabel !== '' ? $categoryLabel : '未選択', 'inline' => true],
                ['name' => '申請日時', 'value' => "{$createdAtJst} JST", 'inline' => true],
            ],
            'url' => $adminUrl,
            'color' => $flagged ? 15105642 : 5793266,
        ]],
        'allowed_mentions' => ['parse' => []],
    ];

    $ch = curl_init($webhookUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    curl_exec($ch);
    $ok = curl_errno($ch) === 0;
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    return $ok && $status >= 200 && $status < 300;
}
