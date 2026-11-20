"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import styles from "./sidebar.module.css";

export function DesktopSidebar({ children }: { children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const outside = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  return (
    <nav
      ref={nav}
      aria-label="Разделы"
      className={styles.rail}
      data-open={open}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (!event.currentTarget.querySelector(":focus-visible"))
          setOpen(false);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setOpen(true);
      }}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          !event.currentTarget.matches(":hover")
        )
          setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.brand}
        aria-label={open ? "Свернуть меню" : "Развернуть меню"}
        aria-expanded={open}
        aria-controls="desktop-section-links"
        onClick={() => setOpen(!open)}
      >
        <BrandMark size={36} />
        <span className={styles.label}>Деканыч</span>
      </button>
      <div
        id="desktop-section-links"
        className={styles.links}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </nav>
  );
}

export function SidebarLabel({ children }: { children: ReactNode }) {
  return <span className={styles.label}>{children}</span>;
}
