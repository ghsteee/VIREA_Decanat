"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/(cabinet)/profile/push-actions";

type State = "loading" | "unavailable" | "off" | "on" | "busy" | "error";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const TEXT: Record<State, string> = {
  loading: "Проверяем…",
  unavailable: "",
  off: "Переносы, отмены и срочные дедлайны — сразу на телефон.",
  on: "Включено на этом устройстве.",
  busy: "Минутку…",
  error: "Не получилось. Попробуй ещё раз чуть позже.",
};

/** Push в 2 касания (S8): переключатель → разрешение браузера. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unavailable");
        return;
      }
      if (Notification.permission === "denied") return setState("unavailable");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unavailable"));
  }, [publicKey]);

  async function toggle() {
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
        return setState(permission === "denied" ? "unavailable" : "off");
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
  if (state === "loading" || state === "unavailable") return null;
  return (
    <section
      aria-labelledby="push-settings-title"
      className="flex items-start justify-between gap-3 border-t border-border py-2.5"
    >
      <div className="min-w-0">
        <h2
          id="push-settings-title"
          className="font-board text-[22px] font-extrabold uppercase"
        >
          Push на телефон
        </h2>
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
    </section>
  );
}
