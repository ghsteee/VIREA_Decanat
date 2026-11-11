import { Flaps } from "@/components/board/flaps";
import { cn } from "@/lib/utils";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

type Event = {
  toStatus: string;
  createdAt: Date;
  pickupNote: string | null;
  rejectReason: string | null;
};

const STEPS = [
  { key: "submitted", label: "Подана" },
  { key: "in_progress", label: "В работе" },
  { key: "ready", label: "Готова · забери" },
  { key: "issued", label: "Выдана" },
] as const;

/** Полный маршрут заявки на табло (A4): остановки с датами на плитках. */
export function VerticalRoute({
  status,
  events,
}: {
  status: string;
  events: Event[];
}) {
  const byStatus = new Map(events.map((e) => [e.toStatus, e]));
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol aria-label="Маршрут заявки" className="m-0 flex list-none flex-col p-0">
      {STEPS.map((step, i) => {
        const ev = byStatus.get(step.key);
        const done = i < current;
        const now = i === current;
        const todo = i > current;
        return (
          <li
            key={step.key}
            aria-current={now ? "step" : undefined}
            className="relative grid grid-cols-[66px_20px_minmax(0,1fr)] gap-2.5 pb-3.5 last:pb-0"
          >
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-[-2px] left-[84.5px] top-4 w-[3px]",
                  done ? "bg-board-link" : "bg-board-line",
                )}
              />
            ) : null}
            <div className="flex flex-col gap-[3px] whitespace-nowrap">
              {ev ? (
                <>
                  <Flaps
                    value={dayMonth(mskDate(ev.createdAt))}
                    size="sm"
                    tone={now ? "change" : todo ? "dim" : "default"}
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      now ? "text-board-change" : "text-board-muted",
                    )}
                  >
                    {mskTime(ev.createdAt)}
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-board-dim">ожидаем</span>
              )}
            </div>
            <span
              aria-hidden
              className={cn(
                "relative z-[1] mx-auto mt-[3px] box-border size-[15px] rounded-full",
                done && "bg-board-link",
                now &&
                  "bg-plate-change shadow-[0_0_0_5px_rgb(249_193_206/0.25)]",
                todo && "border-[3px] border-board-line bg-board-row",
              )}
            />
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "font-board text-[15px] font-bold uppercase leading-[18px] tracking-[0.06em]",
                  now && "text-board-change",
                  todo && "text-board-dim",
                )}
              >
                {now || step.key !== "ready" ? step.label : "Готова"}
              </span>
              {now && ev?.pickupNote ? (
                <span className="text-[13px] leading-[18px]">
                  {ev.pickupNote}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
