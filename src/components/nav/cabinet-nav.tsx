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
import { AccountMenu, type AccountSummary } from "./account-menu";
import { BrandMark } from "@/components/brand-mark";

type Item = { href: string; label: string; icon: LucideIcon };

const STUDENT: Item[] = [
  { href: "/", label: "Сегодня", icon: House },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/study", label: "Учёба", icon: GraduationCap },
  { href: "/requests", label: "Заявки", icon: FileText },
];

const NOTIFICATIONS: Item = { href: "/feed", label: "Уведомления", icon: Bell };

const STAFF: Item[] = [
  { href: "/staff", label: "Заявки", icon: FileText },
  { href: "/staff/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/staff/announcements", label: "Объявления", icon: Megaphone },
];

function isActive(pathname: string, href: string) {
  if (href === "/staff")
    return pathname === href || pathname.startsWith("/staff/requests/");
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CabinetNav({ account }: { account: AccountSummary }) {
  const pathname = usePathname();
  const sections = account.role === "staff" ? STAFF : STUDENT;
  const mobileItems = [
    ...sections,
    { href: "/profile", label: "Профиль", icon: UserRound },
  ];
  const mobileIndex = mobileItems.findIndex((item) =>
    isActive(pathname, item.href),
  );
  const items = [...sections, NOTIFICATIONS];
  const activeIndex = items.findIndex((item) => isActive(pathname, item.href));
  return (
    <>
      <nav
        aria-label="Разделы"
        className="fixed inset-x-[10px] bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 grid rounded-[18px] bg-nav p-1 md:inset-x-6 lg:hidden"
        style={{
          gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0,1fr))`,
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-1 rounded-[14px] bg-nav-active motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${mobileItems.length})`,
            transform: `translateX(${Math.max(mobileIndex, 0) * 100}%)`,
            opacity: mobileIndex < 0 ? 0 : 1,
          }}
        />
        {mobileItems.map(({ href, label, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={i === mobileIndex ? "page" : undefined}
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-[10.5px] no-underline",
              i === mobileIndex
                ? "font-bold text-nav-active-text"
                : "text-nav-text",
            )}
          >
            <Icon size={20} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <header className="cabinet-bar hidden lg:block">
        <div className="cabinet-bar-inner">
          <Link
            className="cabinet-wordmark"
            aria-label="Деканыч — главная"
            href={account.role === "staff" ? "/staff" : "/"}
          >
            <BrandMark size={32} /> Деканыч
          </Link>
          <nav aria-label="Разделы" className="split-nav">
            {items.map(({ href, label, icon: Icon }, i) => (
              <Link
                key={href}
                href={href}
                prefetch={href === "/feed" ? false : undefined}
                aria-label={label}
                aria-current={activeIndex === i ? "page" : undefined}
                className={cn(
                  "split-tab",
                  (i === 0 || i === activeIndex + 1) && "split-first",
                  (i === items.length - 1 || i === activeIndex - 1) &&
                    "split-last",
                )}
              >
                <Icon size={19} aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <AccountMenu key={pathname} account={account} />
        </div>
      </header>
    </>
  );
}
