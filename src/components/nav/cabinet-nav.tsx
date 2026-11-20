"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  FileText,
  GraduationCap,
  House,
  Megaphone,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

type Item = { href: string; label: string; icon: LucideIcon };

const STUDENT: Item[] = [
  { href: "/", label: "Сегодня", icon: House },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/study", label: "Учёба", icon: GraduationCap },
  { href: "/requests", label: "Заявки", icon: FileText },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

const NOTIFICATIONS: Item = { href: "/feed", label: "Уведомления", icon: Bell };

const STAFF: Item[] = [
  { href: "/staff", label: "Заявки", icon: FileText },
  { href: "/staff/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/staff/announcements", label: "Объявления", icon: Megaphone },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/staff")
    return pathname === href || pathname.startsWith("/staff/requests/");
  if (href === "/") return pathname === href;
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
        className="fixed inset-x-[10px] bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 grid rounded-[18px] bg-nav p-1 md:mx-auto md:max-w-[680px] lg:hidden"
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
        className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col items-center gap-1.5 overflow-y-auto bg-[#1d1b18] py-[18px] lg:flex xl:w-52 xl:items-stretch xl:px-3"
      >
        <div className="mb-4 flex items-center gap-3 xl:px-2">
          <BrandMark size={40} alt="Деканыч" />
          <span
            aria-hidden
            className="hidden font-board text-2xl font-bold uppercase text-[#f3f0ea] xl:inline"
          >
            Деканыч
          </span>
        </div>
        {[...items, NOTIFICATIONS].map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] w-[76px] flex-col items-center justify-center gap-[3px] rounded-[14px] text-center text-[11px] no-underline xl:min-h-12 xl:w-full xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-sm",
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
