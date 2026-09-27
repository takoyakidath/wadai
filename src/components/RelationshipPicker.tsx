import { CATEGORY_LABELS, categoryIcon, categoryTheme } from "@/lib/categories";

const MODE_HINTS: Record<string, string> = {
  omakase: "なんでも",
  close_friends: "仲良し同士で",
  first_meeting: "初めて話す人と",
  school: "学校の話で",
  romance: "好きな人のこと",
  date: "デート中に",
  funny: "笑える話で",
};

export function RelationshipPicker({ onChoose }: { onChoose: (key: string) => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-lg font-bold">🎲 ワダイ</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          話題に困ったら、1回まわす。
        </p>
      </div>

      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
        今日は誰と話す？
      </p>

      <div className="grid w-full grid-cols-2 gap-3">
        {Object.keys(CATEGORY_LABELS).map((key) => {
          const theme = categoryTheme(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChoose(key)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-white p-4 shadow-sm active:scale-95 dark:border-white/10 dark:bg-neutral-900"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${theme.chip}`}
              >
                {categoryIcon(key)}
              </span>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                {CATEGORY_LABELS[key]}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {MODE_HINTS[key] ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
