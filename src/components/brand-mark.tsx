/* eslint-disable @next/next/no-img-element */

/** Знак «Деканыча» в цвете текущей темы. */
export function BrandMark({
  size,
  alt = "",
  className = "",
}: {
  size: number;
  alt?: string;
  className?: string;
}) {
  return (
    <>
      <img
        src="/brand/dekanych-mark.svg"
        alt={alt}
        width={size}
        height={size}
        className={`only-light ${className}`}
      />
      <img
        src="/brand/dekanych-mark-dark.svg"
        alt={alt}
        width={size}
        height={size}
        className={`only-dark ${className}`}
      />
    </>
  );
}
