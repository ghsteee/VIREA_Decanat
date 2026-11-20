"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/app/(cabinet)/profile/push-actions";

/** При смене входа привязываем уже разрешённый push без запроса разрешения. */
export function PushSync() {
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    void (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription)
        await savePushSubscription(
          subscription.toJSON() as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          },
        );
    })().catch(() => {
      // Повторная проверка и понятная ошибка доступны в настройках профиля.
    });
  }, []);
  return null;
}
