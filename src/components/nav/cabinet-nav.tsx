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
import { DesktopSidebar, SidebarLabel } from "@/components/ui/sidebar";

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
  { href: "/staff/session", label: "Сессия", icon: GraduationCap },
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
        className="fixed inset-x-[10px] bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 grid rounded-[18px] bg-nav p-1 md:inset-x-6 lg:hidden"
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

      <DesktopSidebar>
        {[...items, NOTIFICATIONS].map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "no-underline",
                active
                  ? "bg-[#f3f0ea] font-bold text-[#1d1b18]"
                  : "text-[#cfcac0]",
              )}
            >
              <Icon size={20} strokeWidth={2} aria-hidden />
              <SidebarLabel>{label}</SidebarLabel>
            </Link>
          );
        })}
      </DesktopSidebar>
    </>
  );
}
