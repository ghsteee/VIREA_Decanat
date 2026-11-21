/** Демонстрационный адрес не должен выглядеть кнопкой реальной встречи. */
export function meetingLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /(^|\.)(example\.(com|net|org)|example|invalid|test|localhost)$/i.test(
        url.hostname,
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
