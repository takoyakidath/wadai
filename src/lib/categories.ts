export const CATEGORY_LABELS: Record<string, string> = {
  omakase: "おまかせ",
  close_friends: "友達",
  first_meeting: "初対面",
  school: "学校",
  romance: "恋愛",
  date: "デート",
  funny: "面白い",
};

export const CATEGORY_ICONS: Record<string, string> = {
  omakase: "🎲",
  close_friends: "🧑‍🤝‍🧑",
  first_meeting: "👋",
  school: "🏫",
  romance: "💓",
  date: "🌸",
  funny: "😂",
};

export function categoryLabel(key: string | null): string {
  if (!key) return "";
  return CATEGORY_LABELS[key] ?? key;
}

export function categoryIcon(key: string | null): string {
  if (!key) return "";
  return CATEGORY_ICONS[key] ?? "";
}

// モードごとの配色。カテゴリタブの選択色・カードのアクセントに使う。
export const CATEGORY_THEME: Record<
  string,
  { activeTab: string; cardAccent: string; chip: string }
> = {
  omakase: {
    activeTab: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
    cardAccent: "border-t-neutral-400 dark:border-t-neutral-500",
    chip: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  },
  close_friends: {
    activeTab: "bg-emerald-500 text-white",
    cardAccent: "border-t-emerald-400",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  first_meeting: {
    activeTab: "bg-sky-500 text-white",
    cardAccent: "border-t-sky-400",
    chip: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  school: {
    activeTab: "bg-amber-500 text-white",
    cardAccent: "border-t-amber-400",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  romance: {
    activeTab: "bg-rose-500 text-white",
    cardAccent: "border-t-rose-400",
    chip: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  date: {
    activeTab: "bg-fuchsia-500 text-white",
    cardAccent: "border-t-fuchsia-400",
    chip: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  },
  funny: {
    activeTab: "bg-orange-500 text-white",
    cardAccent: "border-t-orange-400",
    chip: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
};

const DEFAULT_THEME = CATEGORY_THEME.omakase;

export function categoryTheme(key: string | null) {
  if (!key) return DEFAULT_THEME;
  return CATEGORY_THEME[key] ?? DEFAULT_THEME;
}
