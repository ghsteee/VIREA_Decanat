"use client";

import { useEffect, useRef } from "react";
import styles from "./matrix-eyes.module.css";

const diameter = 288;
const tileWidth = 144;
const tileHeight = 120;

// Один глаз на пиксельной сетке. Разрез оставляет вертикальный зрачок.
const eye = "M0 1h2V0h5v6H5V5H3V4H2V3H0z M9 1h2v1h2v1h1v1h1v1h1v1h-2v1H9z";

export function MatrixEyes() {
  const layer = useRef<SVGSVGElement>(null);
  const tile = useRef<SVGPatternElement>(null);

  useEffect(() => {
    const svg = layer.current;
    const pattern = tile.current;
    if (!svg || !pattern) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    function hide() {
      cancelAnimationFrame(frame);
      frame = 0;
      svg!.removeAttribute("data-active");
    }

    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || event.buttons || document.hidden) {
        hide();
        return;
      }
      x = Math.round(event.clientX) - diameter / 2;
      y = Math.round(event.clientY) - diameter / 2;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        svg!.style.transform = `translate(${x}px, ${y}px)`;
        // Курсор двигает круг света, сама матрица остаётся на месте.
        pattern!.setAttribute("x", String(-x % tileWidth));
        pattern!.setAttribute("y", String(-y % tileHeight));
        svg!.setAttribute("data-active", "");
      });
    }

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("keydown", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("keydown", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);

  return (
    <svg
      ref={layer}
      aria-hidden="true"
      focusable="false"
      width={diameter}
      height={diameter}
      className={styles.light}
    >
      <defs>
        <g id="matrix-eye-pair">
          <path d={eye} />
          <path d={eye} transform="translate(36 0) scale(-1 1)" />
        </g>
        <pattern
          id="matrix-cell"
          ref={tile}
          patternUnits="userSpaceOnUse"
          width={tileWidth}
          height={tileHeight}
        >
          <path
            className={styles.pixels}
            d="M6 12h2v2H6z M8 24h2v5H8z M8 33h2v2H8z M107 49h2v4h-2z M107 57h2v2h-2z M62 86h2v2h-2z M31 102h2v4h-2z M131 93h2v2h-2z"
          />
          <g transform="translate(24 22) scale(1.5)">
            <use href="#matrix-eye-pair" className={styles.blink} />
          </g>
          <g transform="translate(90 87)">
            <use href="#matrix-eye-pair" className={styles.lateBlink} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#matrix-cell)" />
    </svg>
  );
}
