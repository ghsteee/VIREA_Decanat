"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SubjectStanding } from "@/server/queries/study";
import { ActivityRings } from "./activity-rings";
import { SubjectDetails } from "./subject-details";

export function SubjectCarousel({ subjects }: { subjects: SubjectStanding[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [selected, setSelected] = useState<SubjectStanding | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    function measure() {
      if (!el) return;
      const start = el.scrollLeft <= 2;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [subjects.length]);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [selected]);
  function step(dir: number) {
    const el = rail.current;
    if (!el?.firstElementChild) return;
    const width =
      el.firstElementChild.getBoundingClientRect().width +
      parseFloat(getComputedStyle(el).columnGap);
    el.scrollBy({
      left: dir * width,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section
      aria-labelledby="disciplines"
      aria-roledescription="карусель"
      className="min-w-0 px-3 md:px-0"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="disciplines"
          className="font-board text-2xl font-bold uppercase"
        >
          Дисциплины семестра
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            className="study-arrow"
            aria-label="Предыдущие дисциплины"
            disabled={edges.start}
            onClick={() => step(-1)}
          >
            <ChevronLeft aria-hidden size={20} />
          </button>
          <button
            type="button"
            className="study-arrow"
            aria-label="Следующие дисциплины"
            disabled={edges.end}
            onClick={() => step(1)}
          >
            <ChevronRight aria-hidden size={20} />
          </button>
        </div>
      </div>
      <ul
        ref={rail}
        className="study-rail"
        aria-label="Карточки дисциплин"
        onPointerDown={(e) => {
          suppressClick.current = false;
          if (e.pointerType === "mouse" && e.button === 0)
            drag.current = {
              x: e.clientX,
              left: e.currentTarget.scrollLeft,
              moved: false,
            };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || e.buttons !== 1) return;
          const delta = e.clientX - d.x;
          if (!d.moved && Math.abs(delta) < 6) return;
          if (!d.moved) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.dataset.dragging = "true";
          }
          e.currentTarget.scrollLeft = d.left - delta;
        }}
        onPointerUp={(e) => {
          suppressClick.current = !!drag.current?.moved;
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
        }}
        onClickCapture={(e) => {
          if (suppressClick.current && e.detail !== 0) {
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          const buttons = Array.from(
            e.currentTarget.querySelectorAll("button"),
          );
          const i = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (i < 0) return;
          e.preventDefault();
          buttons[i + (e.key === "ArrowRight" ? 1 : -1)]?.focus();
        }}
      >
        {subjects.map((s) => (
          <li key={s.subjectId}>
            <button
              type="button"
              aria-label={s.name}
              aria-haspopup="dialog"
              className="study-card"
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setSelected(s);
              }}
            >
              <ActivityRings subject={s} />
              <span className="flex items-center justify-between gap-3 px-4 py-4 text-left">
                <span className="font-board text-2xl font-bold uppercase leading-tight">
                  {s.name}
                </span>
                <ArrowUpRight
                  aria-hidden
                  size={19}
                  className="shrink-0 text-primary"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="study-dialog"
        aria-labelledby={selected ? `subject-${selected.subjectId}` : undefined}
        onClose={() => {
          setSelected(null);
          trigger.current?.focus({ preventScroll: true });
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              e.currentTarget.close();
          }
        }}
      >
        <div className="sticky top-0 z-10 flex justify-end bg-surface px-4 pt-3">
          <button
            type="button"
            className="study-arrow"
            aria-label="Закрыть подробности"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        {selected && (
          <div className="px-5 pb-6 md:px-7">
            <SubjectDetails subject={selected} />
          </div>
        )}
      </dialog>
    </section>
  );
}
