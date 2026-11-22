"use client";

import { useEffect, useRef } from "react";

// Ordered dithering: each 4×4 tile has sixteen different thresholds.
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type Props = {
  shape: "swirl";
  type: "4x4";
  colorBack: string;
  colorFront: string;
  pxSize: number;
  speed: number;
  paused?: boolean;
};

export function DitheringShader({
  colorBack,
  colorFront,
  pxSize,
  speed,
  paused = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const theme = matchMedia("(prefers-color-scheme: dark)");
    let visible = true;
    let timer = 0;
    let previous = 0;
    let cosine: Float32Array;
    let sine: Float32Array;
    let thresholds: Float32Array;
    let frame: ImageData;

    function paint() {
      const c = Math.cos(phase.current),
        s = Math.sin(phase.current);
      for (let i = 0; i < cosine.length; i++) {
        frame.data[4 * i + 3] =
          cosine[i] * c - sine[i] * s > thresholds[i] ? 255 : 0;
      }
      ctx!.putImageData(frame, 0, 0);
    }

    function tick(now: number) {
      if (previous)
        phase.current += Math.min(now - previous, 120) * 0.00045 * speed;
      previous = now;
      paint();
      timer = window.setTimeout(() => tick(performance.now()), 1000 / 20);
    }

    function sync() {
      clearTimeout(timer);
      previous = 0;
      if (
        visible &&
        !paused &&
        !document.hidden &&
        !motion.matches &&
        speed !== 0
      )
        tick(performance.now());
      else paint();
    }

    function resize() {
      const step = Math.max(1, pxSize);
      const width = Math.max(1, Math.ceil(canvas!.clientWidth / step));
      const height = Math.max(1, Math.ceil(canvas!.clientHeight / step));
      canvas!.width = width;
      canvas!.height = height;
      frame = ctx!.createImageData(width, height);
      // Resolve the CSS theme color through the canvas, including color-mix().
      ctx!.fillStyle = getComputedStyle(canvas!).color;
      ctx!.fillRect(0, 0, 1, 1);
      const rgb = ctx!.getImageData(0, 0, 1, 1).data;
      cosine = new Float32Array(width * height);
      sine = new Float32Array(width * height);
      thresholds = new Float32Array(width * height);
      // Keep the three arms visible even in the wide, shallow dashboard header.
      const radiusY = Math.min(width, height) / 2;
      const radiusX = Math.max(radiusY, width * 0.4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const dx = (x + 0.5 - width / 2) / radiusX;
          const dy = (y + 0.5 - height / 2) / radiusY;
          const r = Math.hypot(dx, dy);
          const angle = 3 * Math.atan2(dy, dx) - 8 * Math.log1p(r * r);
          cosine[i] = Math.cos(angle);
          sine[i] = Math.sin(angle);
          thresholds[i] = (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 10 - 0.4;
          frame.data.set(rgb, i * 4);
        }
      }
      sync();
    }

    resize();
    const bounds = new ResizeObserver(resize);
    bounds.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    visibility.observe(canvas);
    const themeAttribute = new MutationObserver(resize);
    themeAttribute.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    theme.addEventListener("change", resize);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      bounds.disconnect();
      visibility.disconnect();
      themeAttribute.disconnect();
      theme.removeEventListener("change", resize);
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pxSize, speed, paused, colorFront]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
      style={{
        color: colorFront,
        backgroundColor: colorBack,
        maskImage:
          "radial-gradient(ellipse closest-side, transparent 28%, #0005 53%, black 100%)",
      }}
    />
  );
}
