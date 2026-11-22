import type { SubjectStanding } from "@/server/queries/study";
import { Flaps } from "./flaps";

export function SubjectScore({ subject }: { subject: SubjectStanding }) {
  if (subject.status === "unpublished") return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <Flaps
        value={String(subject.points)}
        size="sm"
        label={`Рейтинг: ${subject.points} из 100`}
      />
      <span aria-hidden className="text-xs">
        / 100
      </span>
    </span>
  );
}
