import type { SubjectStanding } from "@/server/queries/study";
export function ActivityRings({
  subject,
  showLegend = false,
}: {
  subject: SubjectStanding;
  showLegend?: boolean;
}) {
  const rings = [
    {
      label: "Посещения",
      done: subject.attendance.present,
      total: subject.attendance.recorded,
      color: "var(--board-link)",
      empty: "Нет отметок",
    },
    {
      label: "Работы",
      done: subject.assignments.filter((w) => w.done).length,
      total: subject.assignments.length,
      color: "var(--board-ok)",
      empty: "Нет плана",
    },
    {
      label: "Доп. достижения",
      done: subject.achievements.filter((a) => a.earned).length,
      total: subject.achievements.length,
      color: "var(--board-change)",
      empty: "Нет целей",
    },
  ];
  return (
    <div className={showLegend ? "flex items-center gap-4 py-4" : "contents"}>
      <svg
        className={showLegend ? "size-[92px] shrink-0" : "study-cover-rings"}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {rings.map(({ label, done, total, color }, i) => {
          const radius = 44 - i * 12;
          return (
            <g key={label} fill="none" strokeWidth="8">
              <circle cx="50" cy="50" r={radius} stroke={color} opacity=".16" />
              {done > 0 && total > 0 && (
                <circle
                  className="study-ring"
                  cx="50"
                  cy="50"
                  r={radius}
                  transform="rotate(-90 50 50)"
                  pathLength="100"
                  stroke={color}
                  strokeLinecap="round"
                  strokeDasharray="100"
                  strokeDashoffset={100 * (1 - Math.min(done / total, 1))}
                />
              )}
            </g>
          );
        })}
      </svg>
      {showLegend && (
        <dl className="min-w-0 flex-1 space-y-2 text-sm">
          {rings.map((r) => (
            <div
              key={r.label}
              className="flex flex-wrap items-baseline justify-between gap-x-2"
            >
              <dt className="flex items-center gap-2">
                <i
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: r.color }}
                />
                {r.label}
              </dt>
              <dd className="font-semibold tabular-nums">
                {r.total ? `${r.done} из ${r.total}` : r.empty}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
