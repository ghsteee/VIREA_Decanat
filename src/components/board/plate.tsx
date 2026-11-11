import { cn } from "@/lib/utils";

type Tone =
  "change" | "danger" | "warning" | "success" | "info" | "head" | "neutral";

const TONE: Record<Tone, string> = {
  change: "bg-plate-change text-plate-ink",
  danger: "bg-plate-danger text-white",
  warning: "bg-plate-warning text-plate-ink",
  success: "bg-plate-success text-plate-ink",
  info: "bg-plate-info text-plate-ink",
  head: "bg-plate-head text-plate-ink",
  neutral:
    "bg-surface-muted text-text shadow-[inset_0_0_0_1px_var(--border-strong)]",
};

/** Плашка-метка в цветах Санзо Вады (docs/design-system.md, «Плашки»). */
export function Plate({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-[3px] px-[5px] font-board text-[14px] font-bold uppercase leading-[18px] tracking-[0.06em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
