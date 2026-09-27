import type { TopicDTO } from "@/lib/topics";
import { categoryIcon, categoryLabel, categoryTheme } from "@/lib/categories";

export function TopicCard({
  topic,
  faded = false,
}: {
  topic: TopicDTO;
  faded?: boolean;
}) {
  const theme = categoryTheme(topic.categoryKey);

  return (
    <div
      className={`wadai-card-in w-full rounded-2xl border border-t-4 border-black/10 bg-white p-6 shadow-sm transition-all dark:border-white/10 dark:bg-neutral-900 ${theme.cardAccent} ${
        faded ? "scale-95 opacity-50" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
          Lv.{topic.depth}
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-1.5 w-1.5 rounded-full ${
                  n <= topic.depth ? "bg-neutral-600 dark:bg-neutral-300" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              />
            ))}
          </span>
        </span>
        {topic.categoryKey && (
          <span className={`rounded-full px-2 py-0.5 ${theme.chip}`}>
            {categoryIcon(topic.categoryKey)} {categoryLabel(topic.categoryKey)}
          </span>
        )}
      </div>
      <p className="text-xl leading-relaxed font-semibold text-neutral-900 dark:text-neutral-50">
        {topic.body}
      </p>
    </div>
  );
}
