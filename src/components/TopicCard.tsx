"use client";

import { useRef, useState } from "react";
import type { TopicDTO } from "@/lib/topics";
import { categoryIcon, categoryLabel, categoryTheme } from "@/lib/categories";

const TAP_MAX_MOVEMENT = 8;
const SWIPE_THRESHOLD = 70;
const FLY_OUT_DISTANCE = 700;
const FLY_OUT_DURATION_MS = 220;

type Drag = { dx: number; dy: number };

export function TopicCard({
  topic,
  faded = false,
  liked,
  onToggleLike,
  onTapDeepen,
  onSwipeUp,
  onSwipeSide,
  swipeDisabled = false,
}: {
  topic: TopicDTO;
  faded?: boolean;
  liked?: boolean;
  onToggleLike?: () => void;
  onTapDeepen?: () => void;
  onSwipeUp?: () => void;
  onSwipeSide?: () => void;
  swipeDisabled?: boolean;
}) {
  const theme = categoryTheme(topic.categoryKey);
  const gesturesEnabled = !swipeDisabled && Boolean(onTapDeepen || onSwipeUp || onSwipeSide);

  const [drag, setDrag] = useState<Drag>({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!gesturesEnabled || !e.isPrimary || flyingOut) return;
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !startRef.current || e.pointerId !== startRef.current.pointerId) return;
    setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !startRef.current || e.pointerId !== startRef.current.pointerId) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    startRef.current = null;
    setDragging(false);

    const distance = Math.hypot(dx, dy);

    if (distance < TAP_MAX_MOVEMENT) {
      setDrag({ dx: 0, dy: 0 });
      onTapDeepen?.();
      return;
    }

    const isVertical = Math.abs(dy) > Math.abs(dx);

    if (isVertical && dy < -SWIPE_THRESHOLD && onSwipeUp) {
      flyOut({ dx, dy: -FLY_OUT_DISTANCE }, onSwipeUp);
      return;
    }

    if (!isVertical && Math.abs(dx) > SWIPE_THRESHOLD && onSwipeSide) {
      const sign = dx > 0 ? 1 : -1;
      flyOut({ dx: sign * FLY_OUT_DISTANCE, dy }, onSwipeSide);
      return;
    }

    setDrag({ dx: 0, dy: 0 });
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !startRef.current || e.pointerId !== startRef.current.pointerId) return;
    startRef.current = null;
    setDragging(false);
    setDrag({ dx: 0, dy: 0 });
  }

  function flyOut(target: Drag, action: () => void) {
    setFlyingOut(true);
    setDrag(target);
    setTimeout(() => {
      action();
      setFlyingOut(false);
      setDrag({ dx: 0, dy: 0 });
    }, FLY_OUT_DURATION_MS);
  }

  const hintUp = dragging && drag.dy < -SWIPE_THRESHOLD && Math.abs(drag.dy) > Math.abs(drag.dx);
  const hintSide = dragging && Math.abs(drag.dx) > SWIPE_THRESHOLD && Math.abs(drag.dx) > Math.abs(drag.dy);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)`,
        opacity: flyingOut ? 0 : 1,
        touchAction: gesturesEnabled ? "none" : undefined,
        cursor: gesturesEnabled ? "grab" : undefined,
      }}
      className={`wadai-card-in relative w-full rounded-2xl border border-t-4 border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 ${theme.cardAccent} ${
        dragging ? "" : "wadai-card-drag"
      } ${faded ? "scale-95 opacity-50" : ""}`}
    >
      {hintUp && (
        <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
          🎲 別の話題
        </div>
      )}
      {hintSide && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
          🔀 広げる
        </div>
      )}
      {onToggleLike && (
        <button
          type="button"
          onClick={onToggleLike}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={liked}
          aria-label={liked ? "マイカードから外す" : "マイカードに入れる"}
          className="absolute top-3 right-3 text-xl leading-none active:scale-90"
        >
          {liked ? "❤️" : "🤍"}
        </button>
      )}
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
      <p className="pr-6 text-xl leading-relaxed font-semibold text-neutral-900 dark:text-neutral-50">
        {topic.body}
      </p>
    </div>
  );
}
