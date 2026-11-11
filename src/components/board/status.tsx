import { cn } from "@/lib/utils";

export type LessonState =
  | { kind: "past" }
  | { kind: "now" }
  | { kind: "soon"; minutes: number }
  | { kind: "planned" }
  | { kind: "moved"; from: string }
  | { kind: "online"; from?: string }
  | { kind: "room"; from: string }
  | { kind: "cancelled" };

/** Слово-статус табло: «скоро», «перенос», «отмена»… */
export function StatusWord({
  state,
  className,
}: {
  state: LessonState;
  className?: string;
}) {
  const base =
    "font-board text-[15px] font-bold uppercase leading-[18px] tracking-[0.06em]";
  switch (state.kind) {
    case "past":
      return (
        <span className={cn(base, "text-board-dim", className)}>прошла</span>
      );
    case "now":
      return <span className={cn(base, "text-board-ok", className)}>идёт</span>;
    case "soon":
      return (
        <span className={cn(base, "text-board-soon", className)}>
          скоро · {state.minutes} мин
        </span>
      );
    case "planned":
      return (
        <span className={cn(base, "text-board-muted", className)}>
          по плану
        </span>
      );
    case "moved":
      return (
        <span className={cn(base, "text-board-change", className)}>
          перенос · было {state.from}
        </span>
      );
    case "online":
      return (
        <span className={cn(base, "text-board-change", className)}>
          дистант{state.from ? ` · было ${state.from}` : ""}
        </span>
      );
    case "room":
      return (
        <span className={cn(base, "text-board-change", className)}>
          новая аудитория · было {state.from}
        </span>
      );
    case "cancelled":
      return (
        <span
          className={cn(
            base,
            "rounded-[3px] bg-plate-danger px-[5px] text-white",
            className,
          )}
        >
          отмена
        </span>
      );
  }
}
