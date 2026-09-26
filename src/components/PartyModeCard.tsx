import type { TopicDTO } from "@/lib/topics";
import { TopicCard } from "@/components/TopicCard";

export function PartyModeCard({
  topic,
  actions,
  mirrored,
}: {
  topic: TopicDTO;
  actions: React.ReactNode;
  mirrored: boolean;
}) {
  return (
    <div
      className={`flex h-1/2 flex-col justify-center gap-3 p-4 ${
        mirrored ? "rotate-180" : ""
      }`}
    >
      <TopicCard topic={topic} />
      <div className="flex justify-center gap-2">{actions}</div>
    </div>
  );
}
