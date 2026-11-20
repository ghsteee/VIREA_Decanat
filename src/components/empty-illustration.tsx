import Image from "next/image";

const dimensions = {
  today: [732, 449],
  requests: [640, 729],
  notifications: [730, 607],
  deadlines: [729, 399],
} as const;

export function EmptyIllustration({
  scene,
}: {
  scene: keyof typeof dimensions;
}) {
  const [width, height] = dimensions[scene];
  return (
    <>
      {(["light", "dark"] as const).map((theme) => (
        <Image
          key={theme}
          src={`/brand/empty-${scene}-${theme}.webp`}
          alt=""
          width={width}
          height={height}
          className={`empty-art only-${theme}`}
          unoptimized
        />
      ))}
    </>
  );
}
