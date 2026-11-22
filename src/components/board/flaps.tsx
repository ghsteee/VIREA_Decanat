import { cn } from "@/lib/utils";

type Props = {
  /** Текст на плитках; двоеточие, точка, запятая, дефис и пробел — разделители. */
  value: string;
  /** Подпись для экранных чтецов, например «Сейчас 10:15» */
  label?: string;
  tone?: "default" | "change" | "dim";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = { sm: "text-[15px]", md: "text-[20px]", lg: "text-[30px]" };

/** Группа плиток перекидного табло (docs/design-system.md, «Плитка»). */
export function Flaps({
  value,
  label,
  tone = "default",
  size = "md",
  className,
}: Props) {
  return (
    <span
      role="img"
      aria-label={label ?? value}
      className={cn(
        "inline-flex whitespace-nowrap",
        SIZE[size],
        tone === "change" && "flaps-change",
        tone === "dim" && "flaps-dim",
        className,
      )}
    >
      {[...value].map((ch, i) =>
        /[:.,\- ]/.test(ch) ? (
          <span key={i} className="flap-sep" aria-hidden>
            {ch === " " ? "" : ch}
          </span>
        ) : (
          <span key={i} className="flap" aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
