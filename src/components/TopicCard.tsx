import type { TopicDTO } from "@/lib/topics";
import { categoryLabel } from "@/lib/categories";

export function TopicCard({
  topic,
  faded = false,
}: {
  topic: TopicDTO;
  faded?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all dark:border-white/10 dark:bg-neutral-900 ${
        faded ? "scale-95 opacity-50" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
          Lv.{topic.depth}
        </span>
        {topic.categoryKey && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            {categoryLabel(topic.categoryKey)}
          </span>
        )}
      </div>
      <p className="text-xl leading-relaxed font-semibold text-neutral-900 dark:text-neutral-50">
        {topic.body}
      </p>
    </div>
  );
}
