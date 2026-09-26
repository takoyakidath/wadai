import type { TopicDTO } from "@/lib/topics";
import { categoryLabel } from "@/lib/categories";

export function RelatedSheet({
  topics,
  onPick,
  onClose,
}: {
  topics: TopicDTO[];
  onPick: (topic: TopicDTO) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            🔀 別の方向へ広げる
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-400"
          >
            閉じる
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {topics.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-500">
              この話題にはまだ関連する話題がありません。
            </p>
          )}
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="rounded-xl border border-black/10 p-3 text-left text-sm hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-neutral-800"
            >
              <span className="mr-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                {categoryLabel(t.categoryKey)}
              </span>
              {t.body}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
