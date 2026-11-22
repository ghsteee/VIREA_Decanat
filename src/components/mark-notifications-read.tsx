"use client";

import { useEffect, useState } from "react";
import { markNotificationsRead } from "@/app/(cabinet)/feed/actions";

export function MarkNotificationsRead({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (key)
      void markNotificationsRead(key.split(",")).catch(() => setFailed(true));
  }, [key]);
  return failed ? (
    <p role="status" className="text-sm text-board-danger-text">
      Не удалось отметить прочитанным. Обнови страницу, чтобы повторить.
    </p>
  ) : null;
}
