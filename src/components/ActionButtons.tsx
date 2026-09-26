export function ActionButtons({
  onLighten,
  onDeepen,
  onWiden,
  onReroll,
  canLighten,
  disabled,
  compact = false,
}: {
  onLighten: () => void;
  onDeepen: () => void;
  onWiden: () => void;
  onReroll: () => void;
  canLighten: boolean;
  disabled: boolean;
  compact?: boolean;
}) {
  const base =
    "flex flex-1 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white font-medium text-neutral-800 shadow-sm active:scale-95 disabled:opacity-40 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100";
  const size = compact ? "px-2 py-2 text-xs" : "px-3 py-3 text-sm";

  return (
    <>
      <button
        type="button"
        onClick={onLighten}
        disabled={disabled || !canLighten}
        className={`${base} ${size}`}
      >
        🌱 軽く
      </button>
      <button
        type="button"
        onClick={onDeepen}
        disabled={disabled}
        className={`${base} ${size} !bg-neutral-900 !text-white dark:!bg-white dark:!text-neutral-900`}
      >
        🔍 深める
      </button>
      <button
        type="button"
        onClick={onWiden}
        disabled={disabled}
        className={`${base} ${size}`}
      >
        🔀 広げる
      </button>
      <button
        type="button"
        onClick={onReroll}
        disabled={disabled}
        className={`${base} ${size}`}
      >
        🎲 別の話題
      </button>
    </>
  );
}
