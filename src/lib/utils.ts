import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Склеивает классы Tailwind без конфликтов — помощник shadcn/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
