"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  GraduationCap,
  House,
  Megaphone,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon };

const STUDENT: Item[] = [
  { href: "/", label: "Сегодня", icon: House },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/study", label: "Учёба", icon: GraduationCap },
  { href: "/requests", label: "Заявки", icon: FileText },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

const STAFF: Item[] = [
  { href: "/staff", label: "Заявки", icon: FileText },
  { href: "/staff/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/staff/announcements", label: "Объявления", icon: Megaphone },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/staff") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Капсула навигации на телефоне и панель слева на десктопе (docs/design-system.md, «Навигация»). */
export function CabinetNav({ role }: { role: "student" | "staff" }) {
  const pathname = usePathname();
  const items = role === "staff" ? STAFF : STUDENT;

  return (
    <>
      <nav
        aria-label="Разделы"
        className="fixed inset-x-[10px] bottom-[10px] z-20 grid rounded-[18px] bg-nav p-1 lg:hidden"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-[10.5px] no-underline",
                active
                  ? "bg-nav-active font-bold text-nav-active-text"
                  : "text-nav-text",
              )}
            >
              <Icon size={20} strokeWidth={2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Разделы"
        className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col items-center gap-1.5 bg-[#1d1b18] py-[18px] lg:flex"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/dekanych-mark.svg"
          alt="Деканыч"
          width={40}
          height={40}
          className="mb-[18px]"
        />
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] w-[76px] flex-col items-center justify-center gap-[3px] rounded-[14px] text-center text-[11px] no-underline",
                active
                  ? "bg-[#f3f0ea] font-bold text-[#1d1b18]"
                  : "text-[#cfcac0]",
              )}
            >
              <Icon size={20} strokeWidth={2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
