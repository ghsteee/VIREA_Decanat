"use server";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { hitRateLimit } from "@/server/rate-limit";
import {
  portfolioStudent,
  ownPortfolioItem,
  portfolioUploads,
  writePortfolioFile,
  removePortfolioFiles,
} from "@/server/portfolio";
import {
  MAX_ITEM_FILES,
  MAX_PORTFOLIO_BYTES,
  MAX_PORTFOLIO_ITEMS,
  UUID,
} from "@/lib/portfolio";
import { mskDate } from "@/lib/time";

export type PortfolioState = { error?: string; location?: string };
export async function savePortfolio(
  _state: PortfolioState,
  form: FormData,
): Promise<PortfolioState> {
  const { studentId, userId } = await portfolioStudent();
  if (!(await hitRateLimit(`portfolio-edit:${userId}`, 40, 3600)).allowed)
    return { error: "Слишком много изменений. Попробуй позже." };
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const id = text("id");
  const current = id ? await ownPortfolioItem(studentId, id) : null;
  const kind = text("kind");
  const award = text("award");
  const title = text("title");
  const eventName = text("eventName");
  const description = text("description");
  const date = text("date");
  const projectUrl = text("projectUrl");
  if (kind !== "work" && kind !== "participation" && kind !== "award")
    return { error: "Выбери вид достижения." };
  if (
    !title ||
    title.length > 160 ||
    description.length > 2000 ||
    eventName.length > 120
  )
    return { error: "Проверь название и описание: до 160 и 2000 символов." };
  if (kind !== "work" && !eventName)
    return { error: "Укажи название хакатона или мероприятия." };
  if (kind === "award" && award !== "winner" && award !== "prize")
    return { error: "Выбери победу или призовое место." };
  const occurredOn = date ? new Date(`${date}T00:00:00Z`) : null;
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(occurredOn!.getTime()) ||
      occurredOn!.toISOString().slice(0, 10) !== date ||
      date > mskDate())
  )
    return { error: "Укажи существующую дату, не позже сегодняшней." };
  if (projectUrl) {
    try {
      const url = new URL(projectUrl);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        projectUrl.length > 500
      )
        throw new Error();
    } catch {
      return {
        error:
          "Для ссылки на работу нужен адрес https://… без логина и пароля.",
      };
    }
  }
  const uploads = await portfolioUploads(form);
  if (uploads.error) return { error: uploads.error };
  const files = uploads.files!;
  const written: string[] = [];
  try {
    const error = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE id = ${studentId}::uuid FOR UPDATE`;
        const count = await tx.portfolioItem.count({ where: { studentId } });
        const used = await tx.portfolioAttachment.aggregate({
          where: { item: { studentId } },
          _sum: { bytes: true },
        });
        const existingFiles = current
          ? await tx.portfolioAttachment.count({
              where: { itemId: current.id },
            })
          : 0;
        if (!current && count >= MAX_PORTFOLIO_ITEMS)
          return "В портфолио можно сохранить до 50 записей.";
        if (existingFiles + files.length > MAX_ITEM_FILES)
          return "У записи уже есть файлы. Всего можно приложить до 5.";
        if (
          (used._sum.bytes ?? 0) +
            files.reduce((sum, f) => sum + f.data.length, 0) >
          MAX_PORTFOLIO_BYTES
        )
          return "Файлы портфолио занимают больше 50 МБ. Удали ненужные вложения.";
        const data = {
          kind: kind as "work" | "participation" | "award",
          award: kind === "award" ? (award as "winner" | "prize") : null,
          title,
          eventName: eventName || null,
          description,
          occurredOn,
          projectUrl: projectUrl || null,
        };
        const item = current
          ? await tx.portfolioItem.update({
              where: { id: current.id, studentId },
              data,
            })
          : await tx.portfolioItem.create({ data: { ...data, studentId } });
        for (const file of files) {
          await writePortfolioFile(file);
          written.push(file.key);
          await tx.portfolioAttachment.create({
            data: {
              itemId: item.id,
              storageKey: file.key,
              name: file.name,
              contentType: file.contentType,
              bytes: file.data.length,
            },
          });
        }
        return null;
      },
      { timeout: 15000 },
    );
    if (error) return { error };
  } catch (error) {
    await removePortfolioFiles(written);
    console.error(
      "Portfolio save failed",
      error instanceof Error ? error.name : "Error",
    );
    return { error: "Не удалось сохранить запись. Попробуй ещё раз." };
  }
  return { location: "/study/portfolio?done=1" };
}
export async function deletePortfolio(
  _state: PortfolioState,
  form: FormData,
): Promise<PortfolioState> {
  const { studentId } = await portfolioStudent();
  const item = await ownPortfolioItem(studentId, String(form.get("id") ?? ""));
  await db.portfolioItem.delete({ where: { id: item.id, studentId } });
  await removePortfolioFiles(item.attachments.map((f) => f.storageKey));
  return { location: "/study/portfolio?removed=1" };
}
export async function deletePortfolioFile(
  _state: PortfolioState,
  form: FormData,
): Promise<PortfolioState> {
  const { studentId } = await portfolioStudent();
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) notFound();
  const file = await db.portfolioAttachment.findFirst({
    where: { id, item: { studentId } },
  });
  if (!file) notFound();
  await db.portfolioAttachment.delete({ where: { id: file.id } });
  await removePortfolioFiles([file.storageKey]);
  return { location: `/study/portfolio/${file.itemId}` };
}
