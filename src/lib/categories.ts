export const CATEGORY_LABELS: Record<string, string> = {
  omakase: "おまかせ",
  first_meeting: "初対面",
  close_friends: "仲良し",
  funny: "面白い",
};

export function categoryLabel(key: string | null): string {
  if (!key) return "";
  return CATEGORY_LABELS[key] ?? key;
}
