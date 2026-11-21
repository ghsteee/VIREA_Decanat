"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ConceptNote } from "@/components/concept-note";

/** Уведомления доступны с любого раздела, в том числе с телефона. */
export function CabinetHeader({ role }: { role: "student" | "staff" }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <header className="cabinet-topbar">
      <Link
        href={role === "staff" ? "/staff" : "/"}
        className="flex min-h-11 items-center gap-2 text-text no-underline"
      >
        <BrandMark size={26} />
        <span className="font-board text-xl font-extrabold uppercase">
          Деканыч
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <ConceptNote />
        <Link
          href="/feed"
          aria-label="Уведомления"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-text hover:bg-border"
        >
          <Bell size={20} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
