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
  const items = [
    ...(account.role === "staff" ? STAFF : STUDENT),
    NOTIFICATIONS,
  ];
  const activeIndex = items.findIndex((item) => isActive(pathname, item.href));
  return (
    <header className="cabinet-bar">
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
              <small aria-hidden>{href === "/feed" ? "Лента" : label}</small>
            </Link>
          ))}
        </nav>
        <AccountMenu key={pathname} account={account} />
      </div>
    </header>
  );
}
