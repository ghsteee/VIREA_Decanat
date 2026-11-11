"use client";

import { useOptimistic, useTransition } from "react";
import { toggleDeadlineDone } from "@/app/(cabinet)/actions";

export function DeadlineCheck({
  id,
  done,
  title,
}: {
  id: string;
  done: boolean;
  title: string;
}) {
  const [pending, start] = useTransition();
  const [checked, setChecked] = useOptimistic(done);
  return (
    <label className="grid size-11 place-items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        aria-label={`Сделано: ${title}`}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setChecked(next);
            await toggleDeadlineDone(id, next);
          });
        }}
        className="size-[22px] accent-primary"
      />
    </label>
  );
}
