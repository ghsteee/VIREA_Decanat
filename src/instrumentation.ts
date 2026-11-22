// Фоновые напоминания о дедлайнах и доставка push и e-mail.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { processDeliveries } = await import("@/server/delivery");
    const { processReminders } = await import("@/server/reminders");
    const tick = async () => {
      try {
        await processReminders();
      } catch (e) {
        console.error("reminder worker", e);
      }
      try {
        await processDeliveries();
      } catch {
        console.error("notification delivery worker failed");
      }
    };
    const timer = setInterval(tick, 15_000);
    timer.unref();
  }
}
