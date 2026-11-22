import { useId } from "react";

// Seamless tiles. Dimensions are in CSS pixels so the stroke stays fine at every card width.
export const COVER_PATTERNS = [
  { width: 40, height: 32, path: "M0 0 20 16 40 0 M0 32 20 16 40 32" },
  { width: 32, height: 32, path: "M-8 8H8V-8 M8 40V24H24V8H40" },
  { width: 32, height: 32, path: "M12 16h8 M16 12v8" },
  { width: 48, height: 28, path: "M0 14h48 M24 0v14 M0 14v14 M0 0h48" },
  {
    width: 40,
    height: 20,
    path: "M0 20A20 20 0 0 1 40 20 M8 20a12 12 0 0 1 24 0",
  },
  { width: 36, height: 32, path: "M-9 0 9 32h18L45 0 M-9 0H9l9 16L27 0h18" },
] as const;

export function CoverPattern({
  pattern,
}: {
  pattern: (typeof COVER_PATTERNS)[number];
}) {
  const id = useId();
  return (
    <svg className="study-cover-pattern" aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id={id}
          width={pattern.width}
          height={pattern.height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={pattern.path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
