<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/response.php';

wadai_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// このスクリプト自身の場所を基準に、デプロイ先が / でも /api/ でも動くようにする
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
if ($scriptDir !== '' && str_starts_with($requestPath, $scriptDir)) {
    $requestPath = substr($requestPath, strlen($scriptDir));
}
$segments = array_values(array_filter(explode('/', $requestPath), fn($s) => $s !== ''));
$method = $_SERVER['REQUEST_METHOD'];

try {
    // GET /categories
    if ($method === 'GET' && $segments === ['categories']) {
        require __DIR__ . '/routes/categories.php';
        exit;
    }

    // GET /topics/random
    if ($method === 'GET' && $segments === ['topics', 'random']) {
        require __DIR__ . '/routes/topics_random.php';
        exit;
    }

    // GET /topics/{id}/deeper
    if ($method === 'GET' && count($segments) === 3 && $segments[0] === 'topics' && $segments[2] === 'deeper') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_deeper.php';
        exit;
    }

    // GET /topics/{id}/related
    if ($method === 'GET' && count($segments) === 3 && $segments[0] === 'topics' && $segments[2] === 'related') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_related.php';
        exit;
    }

    // GET /topics/{id}
    if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'topics') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_show.php';
        exit;
    }

    // POST /submissions
    if ($method === 'POST' && $segments === ['submissions']) {
        require __DIR__ . '/routes/submissions_create.php';
        exit;
    }

    // --- 一般ユーザー（招待制アカウント。AI機能を使うためだけの最小限の認証） ---

    if ($method === 'POST' && $segments === ['register']) {
        require __DIR__ . '/routes/register.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['login']) {
        require __DIR__ . '/routes/user_login.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['logout']) {
        require __DIR__ . '/routes/user_logout.php';
        exit;
    }

    // POST /topics/{id}/ai-deepen（要ログイン）
    if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'topics' && $segments[2] === 'ai-deepen') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_ai_deepen.php';
        exit;
    }

    // POST /topics/{id}/like（要ログイン）
    if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'topics' && $segments[2] === 'like') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_like_add.php';
        exit;
    }

    // DELETE /topics/{id}/like（要ログイン）
    if ($method === 'DELETE' && count($segments) === 3 && $segments[0] === 'topics' && $segments[2] === 'like') {
        $topicId = $segments[1];
        require __DIR__ . '/routes/topics_like_remove.php';
        exit;
    }

    // GET /likes（要ログイン、マイカード一覧）
    if ($method === 'GET' && $segments === ['likes']) {
        require __DIR__ . '/routes/likes_list.php';
        exit;
    }

    // GET /likes/random（要ログイン、マイカードから1件ランダム）
    if ($method === 'GET' && $segments === ['likes', 'random']) {
        require __DIR__ . '/routes/likes_random.php';
        exit;
    }

    // SSHの無いプランでの一回限りの管理者作成用（SETUP_TOKEN未設定なら404）
    if (($method === 'GET' || $method === 'POST') && $segments === ['setup', 'create-admin']) {
        require __DIR__ . '/routes/setup_create_admin.php';
        exit;
    }

    // SSHの無いプランでの一回限りのスキーマ移行用（SETUP_TOKEN未設定なら404）
    if (($method === 'GET' || $method === 'POST') && $segments === ['setup', 'migrate']) {
        require __DIR__ . '/routes/setup_migrate.php';
        exit;
    }

    // --- 管理API（すべて Bearer トークン必須） ---

    if ($method === 'POST' && $segments === ['admin', 'login']) {
        require __DIR__ . '/routes/admin_login.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['admin', 'logout']) {
        require __DIR__ . '/routes/admin_logout.php';
        exit;
    }

    if ($method === 'GET' && $segments === ['admin', 'submissions']) {
        require __DIR__ . '/routes/admin_submissions_list.php';
        exit;
    }

    if ($method === 'POST' && count($segments) === 4 && $segments[0] === 'admin' && $segments[1] === 'submissions' && $segments[3] === 'approve') {
        $submissionId = $segments[2];
        require __DIR__ . '/routes/admin_submission_approve.php';
        exit;
    }

    if ($method === 'POST' && count($segments) === 4 && $segments[0] === 'admin' && $segments[1] === 'submissions' && $segments[3] === 'reject') {
        $submissionId = $segments[2];
        require __DIR__ . '/routes/admin_submission_reject.php';
        exit;
    }

    if ($method === 'GET' && $segments === ['admin', 'topics']) {
        require __DIR__ . '/routes/admin_topics_list.php';
        exit;
    }

    if ($method === 'GET' && count($segments) === 3 && $segments[0] === 'admin' && $segments[1] === 'topics') {
        $topicId = $segments[2];
        require __DIR__ . '/routes/admin_topic_detail.php';
        exit;
    }

    if ($method === 'PATCH' && count($segments) === 3 && $segments[0] === 'admin' && $segments[1] === 'topics') {
        $topicId = $segments[2];
        require __DIR__ . '/routes/admin_topic_update.php';
        exit;
    }

    if ($method === 'POST' && count($segments) === 4 && $segments[0] === 'admin' && $segments[1] === 'topics' && $segments[3] === 'relations') {
        $topicId = $segments[2];
        require __DIR__ . '/routes/admin_topic_relation_add.php';
        exit;
    }

    if ($method === 'DELETE' && count($segments) === 5 && $segments[0] === 'admin' && $segments[1] === 'topics' && $segments[3] === 'relations') {
        $relationId = $segments[4];
        require __DIR__ . '/routes/admin_topic_relation_remove.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['admin', 'topics', 'ai-suggest']) {
        require __DIR__ . '/routes/admin_topics_ai_suggest.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['admin', 'topics', 'ai-suggest-save']) {
        require __DIR__ . '/routes/admin_topics_ai_suggest_save.php';
        exit;
    }

    if ($method === 'GET' && $segments === ['admin', 'invite-tokens']) {
        require __DIR__ . '/routes/admin_invite_tokens_list.php';
        exit;
    }

    if ($method === 'POST' && $segments === ['admin', 'invite-tokens']) {
        require __DIR__ . '/routes/admin_invite_tokens_create.php';
        exit;
    }

    wadai_error('not_found', 'Not found', 404);
} catch (Throwable $e) {
    error_log('[wadai] ' . $e->getMessage());
    wadai_error('internal_error', 'サーバーでエラーが発生しました。', 500);
}
