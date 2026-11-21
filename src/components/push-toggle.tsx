"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/(cabinet)/profile/push-actions";

type State =
  | "loading"
  | "unsupported"
  | "unavailable"
  | "ios-install"
  | "denied"
  | "off"
  | "on"
  | "busy"
  | "error";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const TEXT: Record<State, string> = {
  loading: "Проверяем…",
  unavailable: "Push сейчас недоступен. Все уведомления есть в ленте.",
  unsupported:
    "Этот браузер не умеет push. Уведомления всё равно будут в ленте.",
  "ios-install":
    "На iPhone push работает после «Поделиться» → «На экран «Домой»». Открой Деканыча с экрана «Домой» и включи здесь.",
  denied:
    "Уведомления запрещены в настройках браузера. Разреши их для этого сайта и вернись сюда.",
  off: "Переносы, отмены и срочные дедлайны — сразу на телефон.",
  on: "Включено на этом устройстве.",
  busy: "Минутку…",
  error: "Не получилось. Попробуй ещё раз чуть позже.",
};

/** Push в 2 касания (S8): переключатель → разрешение браузера. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      if (!publicKey) return setState("unavailable");
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = window.matchMedia(
          "(display-mode: standalone)",
        ).matches;
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("error"));
  }, [publicKey]);

  async function toggle() {
    if (!publicKey) return;
    const prev = state;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      if (prev === "on") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return setState(permission === "denied" ? "denied" : "off");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await savePushSubscription(json);
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  const canToggle = state === "on" || state === "off" || state === "error";
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border py-2.5">
      <div className="min-w-0">
        <b className="text-[15px]">Push на телефон</b>
        <p
          className="m-0 text-[13px] leading-[18px] text-text-muted"
          aria-live="polite"
        >
          {TEXT[state]}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={state === "on"}
        aria-label="Push-уведомления"
        disabled={!canToggle}
        onClick={toggle}
        className="relative mt-1 h-11 w-14 flex-none disabled:opacity-40"
      >
        <span
          className={`absolute inset-x-1 top-[9px] h-[26px] rounded-full ${state === "on" ? "bg-primary" : "bg-border-strong"}`}
        />
        <span
          className={`absolute top-3 size-5 rounded-full bg-surface transition-[left] ${state === "on" ? "left-[30px]" : "left-[8px]"}`}
        />
      </button>
    </div>
  );
}
