<?php
declare(strict_types=1);

function wadai_add_like(PDO $pdo, int $userId, string $topicId): void
{
    $pdo->prepare(
        'INSERT IGNORE INTO topic_likes (user_id, topic_id) VALUES (:user_id, :topic_id)'
    )->execute([':user_id' => $userId, ':topic_id' => $topicId]);
}

function wadai_remove_like(PDO $pdo, int $userId, string $topicId): void
{
    $pdo->prepare(
        'DELETE FROM topic_likes WHERE user_id = :user_id AND topic_id = :topic_id'
    )->execute([':user_id' => $userId, ':topic_id' => $topicId]);
}

/** @return array<int, array<string, mixed>> */
function wadai_list_liked_topics(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        wadai_topic_base_select() . '
         JOIN topic_likes l ON l.topic_id = t.id
         WHERE l.user_id = :user_id AND t.status = "published"
         ORDER BY l.created_at DESC
         LIMIT 200'
    );
    $stmt->execute([':user_id' => $userId]);
    $rows = $stmt->fetchAll();
    return array_map(fn($row) => wadai_topic_to_dto($pdo, $row), $rows);
}

function wadai_get_random_liked_topic(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT t.id FROM topics t
         JOIN topic_likes l ON l.topic_id = t.id
         WHERE l.user_id = :user_id AND t.status = "published"'
    );
    $stmt->execute([':user_id' => $userId]);
    $ids = array_column($stmt->fetchAll(), 'id');

    if ($ids === []) {
        return null;
    }

    $pickedId = $ids[array_rand($ids)];
    $topicStmt = $pdo->prepare(wadai_topic_base_select() . ' WHERE t.id = :id');
    $topicStmt->execute([':id' => $pickedId]);
    $topic = $topicStmt->fetch();

    return $topic ? wadai_topic_to_dto($pdo, $topic) : null;
}
