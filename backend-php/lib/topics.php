<?php
declare(strict_types=1);

function wadai_topic_to_dto(PDO $pdo, array $topic): array
{
    $deeperCount = wadai_count_relations($pdo, (int) $topic['id'], 'deepen');
    $relatedCount = wadai_count_relations($pdo, (int) $topic['id'], 'related');

    return [
        'id' => (string) $topic['id'],
        'body' => $topic['body'],
        'categoryKey' => $topic['category_key'] ?? null,
        'depth' => (int) $topic['depth'],
        'hasDeeper' => $deeperCount > 0,
        'hasRelated' => $relatedCount > 0,
    ];
}

function wadai_count_relations(PDO $pdo, int $topicId, string $relationType): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM topic_relations WHERE from_topic_id = :id AND relation_type = :type'
    );
    $stmt->execute([':id' => $topicId, ':type' => $relationType]);
    return (int) $stmt->fetchColumn();
}

function wadai_topic_base_select(): string
{
    return 'SELECT t.id, t.body, t.depth, c.`key` AS category_key
            FROM topics t LEFT JOIN categories c ON c.id = t.category_id';
}

function wadai_list_categories(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT `key`, label FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    return $stmt->fetchAll();
}

/** @param string[] $excludeIds */
function wadai_get_random_topic(PDO $pdo, ?string $categoryKey, array $excludeIds): ?array
{
    $where = ['t.status = "published"', 't.is_starter = 1'];
    $params = [];

    if ($categoryKey !== null) {
        $where[] = 'c.`key` = :category_key';
        $params[':category_key'] = $categoryKey;
    }

    $validExcludeIds = array_values(array_filter($excludeIds, fn($id) => ctype_digit($id)));
    if ($validExcludeIds !== []) {
        $placeholders = [];
        foreach ($validExcludeIds as $i => $id) {
            $key = ":exclude{$i}";
            $placeholders[] = $key;
            $params[$key] = $id;
        }
        $where[] = 't.id NOT IN (' . implode(',', $placeholders) . ')';
    }

    $sql = 'SELECT t.id FROM topics t LEFT JOIN categories c ON c.id = t.category_id WHERE '
        . implode(' AND ', $where);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $ids = array_column($stmt->fetchAll(), 'id');

    if ($ids === []) {
        // 除外指定で候補が尽きた場合は、除外なしで再抽選する
        if ($validExcludeIds !== []) {
            return wadai_get_random_topic($pdo, $categoryKey, []);
        }
        return null;
    }

    $pickedId = $ids[array_rand($ids)];

    $topicStmt = $pdo->prepare(wadai_topic_base_select() . ' WHERE t.id = :id');
    $topicStmt->execute([':id' => $pickedId]);
    $topic = $topicStmt->fetch();

    $pdo->prepare('UPDATE topics SET draw_count = draw_count + 1 WHERE id = :id')
        ->execute([':id' => $pickedId]);

    return $topic ? wadai_topic_to_dto($pdo, $topic) : null;
}

function wadai_get_topic_by_id(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare(wadai_topic_base_select() . ' WHERE t.id = :id AND t.status = "published"');
    $stmt->execute([':id' => $id]);
    $topic = $stmt->fetch();
    return $topic ? wadai_topic_to_dto($pdo, $topic) : null;
}

function wadai_get_deeper_topic(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.body, t.depth, c.`key` AS category_key
         FROM topic_relations r
         JOIN topics t ON t.id = r.to_topic_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE r.from_topic_id = :id AND r.relation_type = "deepen" AND t.status = "published"'
    );
    $stmt->execute([':id' => $id]);
    $rows = $stmt->fetchAll();
    if ($rows === []) {
        return null;
    }
    $picked = $rows[array_rand($rows)];
    return wadai_topic_to_dto($pdo, $picked);
}

function wadai_get_related_topics(PDO $pdo, string $id, int $limit = 3): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.body, t.depth, c.`key` AS category_key
         FROM topic_relations r
         JOIN topics t ON t.id = r.to_topic_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE r.from_topic_id = :id AND r.relation_type = "related" AND t.status = "published"
         ORDER BY r.display_order ASC'
    );
    $stmt->execute([':id' => $id]);
    $rows = $stmt->fetchAll();
    shuffle($rows);
    $picked = array_slice($rows, 0, $limit);
    return array_map(fn($row) => wadai_topic_to_dto($pdo, $row), $picked);
}
