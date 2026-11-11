// Фоновый обработчик доставок: повторы push после временных сбоев (задача 4.6).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { processDeliveries } = await import("@/server/delivery");
  const timer = setInterval(() => {
    processDeliveries().catch((e) => console.error("delivery worker", e));
  }, 15_000);
  timer.unref();
}
