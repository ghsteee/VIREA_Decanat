/** Версия демо-напоминания должна совпадать с текущим сроком дедлайна. */
export function demoReminderKey(id: string, version: number) {
  return `demo-deadline:${id}:v${version}`;
}
