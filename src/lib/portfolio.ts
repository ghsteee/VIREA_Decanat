export const PORTFOLIO_LABELS = {
  work: "Работа",
  participation: "Участие в хакатоне",
  award: "Награда",
} as const;
export const AWARD_LABELS = {
  winner: "Победа",
  prize: "Призовое место",
} as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PORTFOLIO_BYTES = 50 * 1024 * 1024;
export const MAX_ITEM_FILES = 5;
export const MAX_PORTFOLIO_ITEMS = 50;
export const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function safeFileName(value: string, limit = 120) {
  return (
    value
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, limit) || "document"
  );
}
export function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`
    : `${Math.max(1, Math.ceil(bytes / 1024))} КБ`;
}
