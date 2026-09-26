<?php
declare(strict_types=1);

const WADAI_MODERATION_PATTERNS = [
    'phone' => '/0\d{1,4}-?\d{1,4}-?\d{3,4}/',
    'email' => '/[\w.+-]+@[\w-]+\.[\w.-]+/',
    'url' => '/https?:\/\/\S+/',
    'sns_handle' => '/@[A-Za-z0-9_]{6,}/',
    'repeated_char' => '/(.)\1{19,}/u',
];

/** @return string[] */
function wadai_flag_submission(string $body): array
{
    $reasons = [];
    foreach (WADAI_MODERATION_PATTERNS as $reason => $pattern) {
        if (preg_match($pattern, $body) === 1) {
            $reasons[] = $reason;
        }
    }
    return $reasons;
}
