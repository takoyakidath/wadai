<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

$pdo = wadai_db();

$categories = [
    ['key' => 'omakase', 'label' => 'おまかせ', 'sort_order' => 0],
    ['key' => 'first_meeting', 'label' => '初対面', 'sort_order' => 1],
    ['key' => 'close_friends', 'label' => '仲良し', 'sort_order' => 2],
    ['key' => 'funny', 'label' => '面白い', 'sort_order' => 3],
];

$topics = [
    ['key' => 'o1', 'body' => '最近、時間を忘れてハマったことは？', 'category' => 'omakase', 'depth' => 1, 'is_starter' => true],
    ['key' => 'o2', 'body' => 'それを始めたきっかけは？', 'category' => 'omakase', 'depth' => 2],
    ['key' => 'o3', 'body' => 'その中で一番好きなところは？', 'category' => 'omakase', 'depth' => 3],
    ['key' => 'o4', 'body' => 'それを始めてから、自分の中で変わったことはある？', 'category' => 'omakase', 'depth' => 4],
    ['key' => 'o5', 'body' => '子供の頃に好きだった遊びは？', 'category' => 'omakase', 'depth' => 1, 'is_starter' => true],
    ['key' => 'o6', 'body' => '今もたまにやることある？', 'category' => 'omakase', 'depth' => 2],
    ['key' => 'o7', 'body' => '最近買ってよかったものは？', 'category' => 'omakase', 'depth' => 1, 'is_starter' => true],
    ['key' => 'o8', 'body' => 'どこで見つけたの？', 'category' => 'omakase', 'depth' => 2],
    ['key' => 'o9', 'body' => '他に気になってるものある？', 'category' => 'omakase', 'depth' => 2],

    ['key' => 'f1', 'body' => '出身はどのあたりですか？', 'category' => 'first_meeting', 'depth' => 1, 'is_starter' => true],
    ['key' => 'f2', 'body' => 'その土地ならではの好きなところは？', 'category' => 'first_meeting', 'depth' => 2],
    ['key' => 'f3', 'body' => '休みの日は何をして過ごすことが多いですか？', 'category' => 'first_meeting', 'depth' => 1, 'is_starter' => true],
    ['key' => 'f4', 'body' => 'それを始めたきっかけは？', 'category' => 'first_meeting', 'depth' => 2],
    ['key' => 'f5', 'body' => '好きな食べ物は？', 'category' => 'first_meeting', 'depth' => 1, 'is_starter' => true],

    ['key' => 'c1', 'body' => '最近、地味に嬉しかったことは？', 'category' => 'close_friends', 'depth' => 1, 'is_starter' => true],
    ['key' => 'c2', 'body' => 'それって自分にとってどんな意味がある？', 'category' => 'close_friends', 'depth' => 2],
    ['key' => 'c3', 'body' => 'もし1年休みが取れたら何をしたい？', 'category' => 'close_friends', 'depth' => 1, 'is_starter' => true],
    ['key' => 'c4', 'body' => 'なんでそれをやってみたいと思ったの？', 'category' => 'close_friends', 'depth' => 2],
    ['key' => 'c5', 'body' => 'そのとき何を感じそう？', 'category' => 'close_friends', 'depth' => 3],

    ['key' => 'n1', 'body' => '今まで一番くだらない理由でケンカしたことは？', 'category' => 'funny', 'depth' => 1, 'is_starter' => true],
    ['key' => 'n2', 'body' => 'その時どっちが折れたの？', 'category' => 'funny', 'depth' => 2],
    ['key' => 'n3', 'body' => '人生で一番の黒歴史をひとつだけ挙げるなら？', 'category' => 'funny', 'depth' => 1, 'is_starter' => true],
    ['key' => 'n4', 'body' => '今思い出しても笑える？', 'category' => 'funny', 'depth' => 2],
];

$relations = [
    ['from' => 'o1', 'to' => 'o2', 'type' => 'deepen'],
    ['from' => 'o2', 'to' => 'o3', 'type' => 'deepen'],
    ['from' => 'o3', 'to' => 'o4', 'type' => 'deepen'],
    ['from' => 'o5', 'to' => 'o6', 'type' => 'deepen'],
    ['from' => 'o7', 'to' => 'o8', 'type' => 'deepen'],
    ['from' => 'o7', 'to' => 'o9', 'type' => 'deepen'],
    ['from' => 'o1', 'to' => 'o5', 'type' => 'related'],
    ['from' => 'o5', 'to' => 'o1', 'type' => 'related'],
    ['from' => 'o1', 'to' => 'o7', 'type' => 'related'],
    ['from' => 'o7', 'to' => 'o1', 'type' => 'related'],

    ['from' => 'f1', 'to' => 'f2', 'type' => 'deepen'],
    ['from' => 'f3', 'to' => 'f4', 'type' => 'deepen'],
    ['from' => 'f1', 'to' => 'f3', 'type' => 'related'],
    ['from' => 'f3', 'to' => 'f1', 'type' => 'related'],
    ['from' => 'f1', 'to' => 'f5', 'type' => 'related'],
    ['from' => 'f5', 'to' => 'f1', 'type' => 'related'],

    ['from' => 'c1', 'to' => 'c2', 'type' => 'deepen'],
    ['from' => 'c3', 'to' => 'c4', 'type' => 'deepen'],
    ['from' => 'c4', 'to' => 'c5', 'type' => 'deepen'],
    ['from' => 'c1', 'to' => 'c3', 'type' => 'related'],
    ['from' => 'c3', 'to' => 'c1', 'type' => 'related'],

    ['from' => 'n1', 'to' => 'n2', 'type' => 'deepen'],
    ['from' => 'n3', 'to' => 'n4', 'type' => 'deepen'],
    ['from' => 'n1', 'to' => 'n3', 'type' => 'related'],
    ['from' => 'n3', 'to' => 'n1', 'type' => 'related'],
];

$pdo->beginTransaction();

try {
    $categoryIdByKey = [];
    $catStmt = $pdo->prepare(
        'INSERT INTO categories (`key`, label, sort_order) VALUES (:key, :label, :sort_order)
         ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order)'
    );
    foreach ($categories as $c) {
        $catStmt->execute([':key' => $c['key'], ':label' => $c['label'], ':sort_order' => $c['sort_order']]);
        $idStmt = $pdo->prepare('SELECT id FROM categories WHERE `key` = :key');
        $idStmt->execute([':key' => $c['key']]);
        $categoryIdByKey[$c['key']] = (int) $idStmt->fetchColumn();
    }

    $topicIdByKey = [];
    $topicStmt = $pdo->prepare(
        'INSERT INTO topics (body, category_id, depth, is_starter, status, source)
         VALUES (:body, :category_id, :depth, :is_starter, "published", "seed")'
    );
    foreach ($topics as $t) {
        $topicStmt->execute([
            ':body' => $t['body'],
            ':category_id' => $categoryIdByKey[$t['category']],
            ':depth' => $t['depth'],
            ':is_starter' => !empty($t['is_starter']) ? 1 : 0,
        ]);
        $topicIdByKey[$t['key']] = (int) $pdo->lastInsertId();
    }

    $relStmt = $pdo->prepare(
        'INSERT INTO topic_relations (from_topic_id, to_topic_id, relation_type)
         VALUES (:from_id, :to_id, :type)'
    );
    foreach ($relations as $r) {
        $relStmt->execute([
            ':from_id' => $topicIdByKey[$r['from']],
            ':to_id' => $topicIdByKey[$r['to']],
            ':type' => $r['type'],
        ]);
    }

    $pdo->commit();
    echo 'Seeded ' . count($categories) . ' categories, ' . count($topics) . ' topics, '
        . count($relations) . " relations.\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Seed failed: ' . $e->getMessage() . "\n");
    exit(1);
}
