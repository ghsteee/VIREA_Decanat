import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  MAX_FILE_BYTES,
  MAX_ITEM_FILES,
  UUID,
  safeFileName,
} from "@/lib/portfolio";

export const portfolioInclude = {
  attachments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.PortfolioItemInclude;
export type PortfolioEntry = Prisma.PortfolioItemGetPayload<{
  include: typeof portfolioInclude;
}>;
export async function portfolioStudent() {
  const user = await requireUser();
  if (user.role !== "student" || !user.studentProfileId) notFound();
  return { studentId: user.studentProfileId, userId: user.id };
}
export function portfolioEntries(studentId: string) {
  return db.portfolioItem.findMany({
    where: { studentId },
    include: portfolioInclude,
    orderBy: [
      { occurredOn: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  });
}
export async function ownPortfolioItem(studentId: string, id: string) {
  if (!UUID.test(id)) notFound();
  const item = await db.portfolioItem.findFirst({
    where: { id, studentId },
    include: portfolioInclude,
  });
  if (!item) notFound();
  return item;
}
export type Upload = {
  key: string;
  name: string;
  contentType: string;
  data: Buffer;
};
export async function portfolioUploads(
  form: FormData,
): Promise<
  { files: Upload[]; error?: never } | { error: string; files?: never }
> {
  const files = form
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > MAX_ITEM_FILES)
    return { error: "К одной записи можно приложить до 5 файлов." };
  const uploads: Upload[] = [];
  for (const file of files) {
    if (!file.size || file.size > MAX_FILE_BYTES)
      return { error: "Каждый файл должен быть непустым и не больше 5 МБ." };
    const name = safeFileName(file.name);
    const ext = path.extname(name).toLowerCase();
    const data = Buffer.from(await file.arrayBuffer());
    const zip =
      data[0] === 0x50 &&
      data[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(data[2]);
    const formats: Record<string, [string, boolean]> = {
      ".pdf": [
        "application/pdf",
        data.subarray(0, 1024).includes(Buffer.from("%PDF-")),
      ],
      ".png": [
        "image/png",
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      ],
      ".jpg": [
        "image/jpeg",
        data[0] === 255 && data[1] === 216 && data[2] === 255,
      ],
      ".jpeg": [
        "image/jpeg",
        data[0] === 255 && data[1] === 216 && data[2] === 255,
      ],
      ".webp": [
        "image/webp",
        data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP",
      ],
      ".zip": ["application/zip", zip],
      ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        zip,
      ],
      ".txt": ["text/plain; charset=utf-8", !data.includes(0)],
    };
    const format = formats[ext];
    if (!format || !format[1])
      return {
        error:
          "Подойдут PDF, JPG, PNG, WEBP, ZIP, DOCX и TXT. Проверь формат файла.",
      };
    uploads.push({ key: randomUUID(), name, contentType: format[0], data });
  }
  return { files: uploads };
}
function storagePath(key: string) {
  if (!UUID.test(key)) throw new Error("Invalid storage key");
  return path.join(
    path.resolve(
      process.env.PORTFOLIO_STORAGE_DIR ||
        path.join(process.cwd(), "storage/portfolio"),
    ),
    key,
  );
}
export async function writePortfolioFile(file: Upload) {
  const target = storagePath(file.key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.data, { flag: "wx", mode: 0o600 });
}
export async function readPortfolioFile(key: string) {
  return readFile(storagePath(key));
}
export async function removePortfolioFiles(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await unlink(storagePath(key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
          console.error("Portfolio file cleanup failed");
      }
    }),
  );
}
