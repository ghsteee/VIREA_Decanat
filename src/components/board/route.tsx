import { cn } from "@/lib/utils";

export const ROUTE_STEPS = [
  "submitted",
  "in_progress",
  "ready",
  "issued",
] as const;
export type RouteStatus = (typeof ROUTE_STEPS)[number] | "rejected";

const LABEL: Record<(typeof ROUTE_STEPS)[number], string> = {
  submitted: "подана",
  in_progress: "в работе",
  ready: "готова",
  issued: "выдана",
};

/** Компактный маршрут заявки «Подана → В работе → Готова → Выдана» (A4). */
export function CompactRoute({
  status,
  dates,
}: {
  status: RouteStatus;
  dates: Partial<Record<(typeof ROUTE_STEPS)[number], string>>;
}) {
  const current = status === "rejected" ? 1 : ROUTE_STEPS.indexOf(status);
  return (
    <ol aria-label="Этапы заявки" className="relative grid grid-cols-4">
      <span
        aria-hidden
        className="absolute left-[12.5%] right-[12.5%] top-[6px] h-[3px] bg-border"
      />
      <span
        aria-hidden
        className="absolute left-[12.5%] top-[6px] h-[3px] bg-primary"
        style={{ width: `${(Math.max(current, 0) / 3) * 75}%` }}
      />
      {ROUTE_STEPS.map((step, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={step}
            aria-current={now ? "step" : undefined}
            className="relative flex flex-col items-center gap-1 text-center"
          >
            <i
              className={cn(
                "box-border size-[15px] rounded-full",
                done && "bg-primary",
                now &&
                  "bg-plate-change shadow-[0_0_0_4px_rgb(249_193_206/0.45)]",
                !done && !now && "border-[3px] border-border bg-bg",
              )}
            />
            <span
              className={cn(
                "font-board text-[15px] font-bold uppercase tracking-[0.06em]",
                now && "rounded-[3px] bg-plate-change px-1 text-plate-ink",
                !done && !now && "text-text-muted",
              )}
            >
              {LABEL[step]}
            </span>
            <span className="text-[11px] text-text-muted">
              {dates[step] ?? ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
