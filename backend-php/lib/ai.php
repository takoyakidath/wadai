<?php
declare(strict_types=1);

require_once __DIR__ . '/moderation.php'; // wadai_flag_submission() を使う

const WADAI_AI_MODEL = 'gpt-4o-mini';
const WADAI_AI_DAILY_LIMIT_PER_USER = 20;

// trim() の第2引数はバイト単位で処理されるため、「」『』のようなマルチバイト文字を渡すと
// UTF-8のバイト列を破壊してしまう（DBへのINSERTが文字コードエラーで落ちる）。
// マルチバイト安全な trim として正規表現ベースのものを使う。
function wadai_mb_trim(string $text): string
{
    return preg_replace('/^[\s"「」『』]+|[\s"「」『』]+$/u', '', $text) ?? $text;
}

function wadai_ai_daily_count(PDO $pdo, int $userId): int
{
    // 「今日」の境界はMySQL側のCURDATE()で判定する（PHPの date() だと
    // PHP/MySQLのタイムゾーン設定差で「今日」がズレる）。
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM ai_generation_log WHERE user_id = :user_id AND created_at >= CURDATE()'
    );
    $stmt->execute([':user_id' => $userId]);
    return (int) $stmt->fetchColumn();
}

const WADAI_DEPTH_GUIDE = [
    1 => '事実・好み（例: 好きな〜は？）',
    2 => '経験・きっかけ（例: 始めたきっかけは？）',
    3 => '感情・意味づけ（例: そのとき何を感じた？）',
    4 => '価値観・仮定（例: もし〜ならどうする？）',
];

// カテゴリ（=モード）ごとにAIへ渡すトーン指示。「友達・初対面・学校・恋愛・デート」等の
// シーンに合わせて、話題の踏み込み方や語彙のニュアンスを変える。
const WADAI_CATEGORY_AI_GUIDE = [
    'omakase' => '幅広い日常の話題でOK。特定のシーンに寄せすぎない。',
    'close_friends' => '普段からよく話す友達同士の設定。多少踏み込んだ自己開示や本音寄りの質問もOK。',
    'first_meeting' => '出会って間もない相手の設定。答えやすく当たり障りのない、安全な質問にする。深い自己開示や価値観を問う質問は避ける。',
    'school' => '学校生活（部活・委員会・行事・授業・進路など）を舞台にした質問にする。学校に関係ない話題にはしない。',
    'romance' => '恋愛・好きな人にまつわる話題。健全な範囲に留め、性的な内容や過度にプライベートな詮索（体の関係・具体的な連絡先の共有など）は絶対に含めない。',
    'date' => '実際に会ってデート中の相手同士という設定。今この場や直近の出来事について聞く、その場で答えやすい質問にする。性的な内容は絶対に含めない。',
    'funny' => '笑える・ちょっとした失敗談やあるあるを引き出す軽いテンションの質問にする。',
];

function wadai_category_ai_guide(?string $categoryKey): string
{
    return WADAI_CATEGORY_AI_GUIDE[$categoryKey] ?? WADAI_CATEGORY_AI_GUIDE['omakase'];
}

// 初対面・学校は「少し丁寧」、それ以外は友達同士のタメ口。書き言葉のアンケート調（「〜ことは？」
// 「〜のは？」型）になりがちなので、実際に話しかける時の自然な話し言葉にするよう明示する。
const WADAI_POLITE_CATEGORIES = ['first_meeting', 'school'];

function wadai_category_register(?string $categoryKey): string
{
    if (in_array($categoryKey, WADAI_POLITE_CATEGORIES, true)) {
        return '少し丁寧なタメ口寄り（「です/ます」「ありますか？」は使ってよいが、話しかけるような自然な話し言葉にする。「〜することが多いですか？」のような作文・アンケート調の硬い言い回しは避ける）。';
    }
    return '友達同士のタメ口（「って」「してる？」「〜の？」のような普段の話し言葉にする。「〜ことは？」「〜のは？」のような書き言葉・アンケート調の言い回しは避ける）。';
}

/**
 * 直前の話題（parentTopic）を深掘りする、次の1問をAIで生成する。
 * 失敗・不適切判定の場合は null を返す（呼び出し側は「今は生成できません」等にフォールバック）。
 */
function wadai_ai_generate_deeper_topic(string $parentBody, int $nextDepth, ?string $categoryLabel, ?string $categoryKey = null): ?string
{
    $apiKey = wadai_env('OPENAI_API_KEY', '');
    if ($apiKey === '') {
        return null;
    }

    $depthGuide = WADAI_DEPTH_GUIDE[$nextDepth] ?? WADAI_DEPTH_GUIDE[4];
    $categoryLine = $categoryLabel !== null ? "カテゴリ（モード）: {$categoryLabel}\n" : '';
    $categoryGuide = wadai_category_ai_guide($categoryKey);
    $register = wadai_category_register($categoryKey);

    $systemPrompt = <<<PROMPT
あなたは会話ガチャアプリ「ワダイ」の話題生成アシスタントです。
主な利用者は日本の現役高校生で、友達同士・初対面・恋愛中のカップルなど様々なシーンでスマホを見せ合いながら使います。
ユーザーが直前の質問に答えたという想定で、それを自然に深掘りする「次の質問」を1つだけ日本語で作ってください。

制約:
- 出力は質問文1つだけ。前置き・説明・かぎ括弧は付けない。
- 200文字以内、できれば40文字以内の短い1文。
- 「なぜ」を使わない。「どこが」「どんな」「そのとき」「それから」「もし」のような自然な言い回しにする。
- このレベルにふさわしい深さにする: {$depthGuide}
- このモード向けのトーン: {$categoryGuide}
- 話し方: {$register}
- 今の高校生が実際に使う自然な言葉づかいにする（LINE・SNS・部活・受験など今どきの学校生活の語彙は歓迎。逆に、懐かしネタ・オヤジギャグ・世代が上の人にしか伝わらないネタ・古いテレビ/芸人ネタは絶対に使わない）。
- 本名・連絡先・住所・SNSアカウントなど、個人を特定できる情報を尋ねない。
- 直前の質問の自然な延長になるようにする。話題を変えない。
PROMPT;

    $userPrompt = "{$categoryLine}直前の質問: {$parentBody}";

    $payload = [
        'model' => WADAI_AI_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ],
        'max_tokens' => 80,
        'temperature' => 0.9,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer {$apiKey}",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $ok = curl_errno($ch) === 0;
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (!$ok || $status < 200 || $status >= 300 || !is_string($raw)) {
        error_log('[wadai] OpenAI request failed: status=' . $status);
        return null;
    }

    $decoded = json_decode($raw, true);
    $text = $decoded['choices'][0]['message']['content'] ?? null;
    if (!is_string($text)) {
        return null;
    }

    $text = wadai_mb_trim($text);
    if ($text === '' || mb_strlen($text) > 200) {
        return null;
    }

    // 既存の申請モデレーションと同じ正規表現チェックを、生成結果に対する最後の安全網として使う
    if (wadai_flag_submission($text) !== []) {
        return null;
    }

    return $text;
}

/**
 * 管理画面のコンテンツ作成支援用：Lv.1〜4の4問チェーンを1回のAI呼び出しでまとめて生成する。
 * 保存はしない（管理者が確認・編集してから別途保存する）。失敗時は null。
 *
 * @return string[]|null 4件の質問文（Lv.1〜4）
 */
function wadai_ai_generate_chain(?string $categoryLabel, ?string $categoryKey = null): ?array
{
    $apiKey = wadai_env('OPENAI_API_KEY', '');
    if ($apiKey === '') {
        return null;
    }

    $categoryLine = $categoryLabel !== null ? "カテゴリ（モード）: {$categoryLabel}\n" : '';
    $categoryGuide = wadai_category_ai_guide($categoryKey);
    $register = wadai_category_register($categoryKey);

    $systemPrompt = <<<PROMPT
あなたは会話ガチャアプリ「ワダイ」のコンテンツ作成アシスタントです。
主な利用者は日本の現役高校生で、友達同士・初対面・恋愛中のカップルなど様々なシーンで使います。
1つのテーマについて、段階的に深掘りする4段階の質問チェーンを新しく考えてください。

制約:
- Lv.1=事実・好み、Lv.2=経験・きっかけ、Lv.3=感情・意味づけ、Lv.4=価値観・仮定、という深さの流れにする。
- 各質問は40文字以内、自然な日本語の1文。「なぜ」は使わない。
- Lv.2以降は直前の質問への自然な深掘りにする（話題を変えない）。
- このモード向けのトーン: {$categoryGuide}
- 話し方: {$register}
- 今の高校生が実際に使う自然な言葉づかいにする（LINE・SNS・部活・推し活・受験など今どきの語彙は歓迎。懐かしネタ・オヤジギャグ・世代が上の人にしか伝わらないネタ・古いテレビ/芸人ネタは絶対に使わない）。
- 本名・連絡先・住所など個人を特定できる情報を尋ねない。
- 出力は次のJSON形式のみ。他の文章は一切含めない: {"lv1":"...","lv2":"...","lv3":"...","lv4":"..."}
PROMPT;

    $userPrompt = $categoryLine . 'このカテゴリ向けに、既存の話題と重複しなさそうな新しいテーマで4段階チェーンを1つ作ってください。';

    $payload = [
        'model' => WADAI_AI_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ],
        'max_tokens' => 300,
        'temperature' => 1.0,
        'response_format' => ['type' => 'json_object'],
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer {$apiKey}",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $ok = curl_errno($ch) === 0;
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (!$ok || $status < 200 || $status >= 300 || !is_string($raw)) {
        error_log('[wadai] OpenAI chain request failed: status=' . $status);
        return null;
    }

    $decoded = json_decode($raw, true);
    $content = $decoded['choices'][0]['message']['content'] ?? null;
    if (!is_string($content)) {
        return null;
    }

    $chain = json_decode($content, true);
    if (!is_array($chain)) {
        return null;
    }

    $result = [];
    foreach (['lv1', 'lv2', 'lv3', 'lv4'] as $key) {
        $text = wadai_mb_trim((string) ($chain[$key] ?? ''));
        if ($text === '' || mb_strlen($text) > 200 || wadai_flag_submission($text) !== []) {
            return null;
        }
        $result[] = $text;
    }

    return $result;
}
