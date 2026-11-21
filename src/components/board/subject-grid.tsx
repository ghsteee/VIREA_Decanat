"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { SubjectStanding } from "@/server/queries/study";
import { ActivityRings } from "./activity-rings";
import { SubjectDetails } from "./subject-details";
import { COVER_PATTERNS, CoverPattern } from "./cover-pattern";

export function SubjectGrid({ subjects }: { subjects: SubjectStanding[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<SubjectStanding | null>(null);
  // Keep a subject's pattern when its admission status changes the display order.
  const patterns = new Map(
    subjects
      .map((s) => s.subjectId)
      .sort()
      .map((id, i) => [id, COVER_PATTERNS[i % COVER_PATTERNS.length]]),
  );
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [selected]);
  return (
    <section aria-labelledby="disciplines" className="min-w-0 px-3 md:px-0">
      <h2
        id="disciplines"
        className="mb-3 font-board text-2xl font-bold uppercase"
      >
        Дисциплины семестра
      </h2>
      <ul className="study-grid" aria-label="Карточки дисциплин">
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
              <div className="study-cover">
                <CoverPattern pattern={patterns.get(s.subjectId)!} />
                <ActivityRings subject={s} />
              </div>
              <span className="study-caption">
                <span className="text-left font-board text-2xl font-bold uppercase leading-tight">
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
            className="study-close"
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
