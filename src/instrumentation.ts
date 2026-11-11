// Фоновые задачи: напоминания о дедлайнах (4.8) и повторы доставки push (4.6).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { processDeliveries } = await import("@/server/delivery");
  const { processReminders } = await import("@/server/reminders");
  const tick = async () => {
    try {
      await processReminders();
      await processDeliveries();
    } catch (e) {
      console.error("background worker", e);
    }
  };
  const timer = setInterval(tick, 15_000);
  timer.unref();
}
