import {
  Check,
  FileText,
  FolderCheck,
  Inbox,
  Stamp,
  CircleX,
} from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

const steps = [
  { key: "submitted", label: "Подана", icon: Inbox },
  { key: "in_progress", label: "В работе", icon: FileText },
  { key: "ready", label: "Готова", icon: Stamp },
  { key: "issued", label: "Выдана", icon: FolderCheck },
] as const;
type Event = {
  toStatus: string;
  createdAt: Date;
  pickupNote: string | null;
};

export function RequestRoute({
  status,
  events,
}: {
  status: ApplicationStatus;
  events: Event[];
}) {
  const history = new Map(events.map((e) => [e.toStatus, e]));
  const rejected = status === "rejected";
  const stations = rejected
    ? [
        ...steps.filter((s) => history.has(s.key)),
        { key: "rejected", label: "Отказ", icon: CircleX },
      ]
    : steps;
  const current = stations.findIndex((s) => s.key === status);
  return (
    <div className="request-route" data-state={status}>
      <ol
        aria-label="Маршрут заявки"
        style={{
          gridTemplateColumns: `repeat(${stations.length}, minmax(0,1fr))`,
        }}
      >
        {stations.map(({ key, label, icon: Icon }, i) => {
          const event = history.get(key);
          return (
            <li
              key={key}
              aria-current={i === current ? "step" : undefined}
              data-past={i < current}
            >
              {i < stations.length - 1 && (
                <svg
                  aria-hidden="true"
                  className="route-track"
                  viewBox="0 0 100 24"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 12 H30 C39 12 36 3 45 3 H56 C65 3 62 12 71 12 H100"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
              <span className="route-stop">
                {i < current ? (
                  <Check aria-hidden size={14} />
                ) : (
                  <Icon aria-hidden size={16} />
                )}
              </span>
              <b>{label}</b>
              {event && (
                <time dateTime={event.createdAt.toISOString()}>
                  {dayMonth(mskDate(event.createdAt))}
                  <br />
                  {mskTime(event.createdAt)}
                </time>
              )}
            </li>
          );
        })}
      </ol>
      {status === "ready" && history.get(status)?.pickupNote && (
        <p>{history.get(status)?.pickupNote}</p>
      )}
    </div>
  );
}
