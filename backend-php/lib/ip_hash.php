<?php
declare(strict_types=1);

function wadai_client_ip(): string
{
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwardedFor !== '') {
        $parts = explode(',', $forwardedFor);
        return trim($parts[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function wadai_hash_ip(string $ip): string
{
    $salt = wadai_env('SUBMISSION_IP_SALT', '');
    return hash('sha256', "{$salt}:{$ip}");
}
