import Image from "next/image";

type Scene = "today" | "requests" | "notifications" | "deadlines";

/** Декоративная иллюстрация: смысл пустого состояния задаёт текст рядом. */
export function EmptyIllustration({ scene }: { scene: Scene }) {
  return (
    <div aria-hidden="true" className="size-28 shrink-0">
      {(["light", "dark"] as const).map((theme) => (
        <Image
          key={theme}
          src={`/brand/empty-${scene}-${theme}.webp`}
          alt=""
          width={112}
          height={112}
          className={`only-${theme}`}
          unoptimized
        />
      ))}
    </div>
  );
}
