import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { zipSync } from "fflate";
import type { PortfolioEntry } from "@/server/portfolio";
import { readPortfolioFile } from "@/server/portfolio";
import {
  AWARD_LABELS,
  MAX_FILE_BYTES,
  MAX_PORTFOLIO_BYTES,
  PORTFOLIO_LABELS,
  safeFileName,
} from "@/lib/portfolio";
import { mskDate } from "@/lib/time";

export type PortfolioOwner = {
  firstName: string;
  lastName: string;
  middleName: string | null;
  group: { code: string; course: number };
};
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "long",
  }).format(date);
const clean = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

export async function portfolioPdf(
  owner: PortfolioOwner,
  entries: PortfolioEntry[],
) {
  const regular = path.join(process.cwd(), "public/fonts/onest-regular.ttf");
  const semibold = path.join(process.cwd(), "public/fonts/onest-semibold.ttf");
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, left: 48, right: 48, bottom: 76 },
    bufferPages: true,
    font: regular,
    info: {
      Title: "Личное портфолио",
      Author: "Деканыч",
      Subject: "Работы, участие в хакатонах и награды",
    },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Onest", regular);
  doc.registerFont("OnestBold", semibold);
  const width = doc.page.width - 96;
  const font = (bold = false, size = 10, color = "#263238") =>
    doc
      .font(bold ? "OnestBold" : "Onest")
      .fontSize(size)
      .fillColor(color);
  const room = (height: number) => {
    if (doc.y + height > doc.page.height - 76) doc.addPage();
  };
  doc.roundedRect(36, 36, doc.page.width - 72, 160, 16).fill("#064F6E");
  font(true, 10, "#F9C1CE").text("ДЕКАНЫЧ", 54, 52);
  font(true, 27, "#FFFFFF").text("Портфолио", 54, 74, { width: width - 12 });
  font(true, 17, "#FFFFFF").text(
    clean(
      [owner.lastName, owner.firstName, owner.middleName]
        .filter(Boolean)
        .join(" "),
    ),
    54,
    112,
    { width: width - 12, height: 47 },
  );
  font(false, 10, "#D3E5EB").text(
    `${owner.group.code}  /  ${owner.group.course} курс`,
    54,
    166,
  );
  const metricWidth = (width - 20) / 3;
  (["work", "participation", "award"] as const).forEach((kind, i) => {
    const x = 48 + i * (metricWidth + 10);
    doc.roundedRect(x, 214, metricWidth, 61, 9).fill("#F2EAD5");
    font(false, 9, "#52636A").text(
      ["Работы", "Участие", "Награды"][i],
      x + 12,
      224,
    );
    font(true, 20, "#064F6E").text(
      String(entries.filter((item) => item.kind === kind).length),
      x + 12,
      242,
    );
  });
  doc.y = 294;
  doc.x = 48;
  font(false, 8, "#63747B").text(
    `Сформировано ${dateLabel(new Date())}. Сведения и документы добавлены студентом.`,
    { width },
  );
  doc.moveDown(1.2);
  for (const kind of ["work", "participation", "award"] as const) {
    const items = entries.filter((item) => item.kind === kind);
    if (!items.length) continue;
    room(70);
    font(true, 15, "#064F6E").text(
      {
        work: "Работы и проекты",
        participation: "Участие в хакатонах",
        award: "Награды и победы",
      }[kind],
      48,
      doc.y,
      { width },
    );
    doc.moveDown(0.65);
    for (const item of items) {
      room(90);
      font(true, 12).text(clean(item.title), 48, doc.y, { width });
      doc.moveDown(0.3);
      const meta = [
        item.award ? AWARD_LABELS[item.award] : PORTFOLIO_LABELS[item.kind],
        item.eventName,
        item.occurredOn ? dateLabel(item.occurredOn) : null,
      ]
        .filter(Boolean)
        .join("  /  ");
      font(false, 9, "#52636A").text(clean(meta), { width, lineGap: 2 });
      doc.moveDown(0.5);
      if (item.description) {
        font(false, 10).text(clean(item.description), { width, lineGap: 3 });
        doc.moveDown(0.45);
      }
      if (item.projectUrl) {
        font(false, 9, "#064F6E").text("Ссылка на работу", {
          width,
          link: item.projectUrl,
          underline: true,
        });
        doc.moveDown(0.4);
      }
      if (item.attachments.length) {
        font(false, 8, "#52636A").text(
          `Приложенные файлы: ${clean(item.attachments.map((f) => f.name).join(", "))}`,
          { width, lineGap: 2 },
        );
        doc.moveDown(0.3);
      }
      const y = doc.y + 5;
      doc
        .moveTo(48, y)
        .lineTo(48 + width, y)
        .lineWidth(0.5)
        .strokeColor("#D9E1E4")
        .stroke();
      doc.y = y + 14;
    }
  }
  if (!entries.length)
    font(false, 11).text("В портфолио пока нет записей.", 48, doc.y, { width });
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    if (page > 0)
      font(false, 8, "#63747B").text("Деканыч  /  Личное портфолио", 48, 28, {
        width,
        lineBreak: false,
      });
    font(false, 8, "#63747B").text(
      `Деканыч  /  ${mskDate()}  /  ${page + 1} из ${range.count}`,
      48,
      doc.page.height - 36,
      { width, align: "right", lineBreak: false },
    );
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return result;
}

export async function portfolioZip(pdf: Buffer, entries: PortfolioEntry[]) {
  const files: Record<string, Uint8Array> = Object.create(null);
  files["portfolio.pdf"] = pdf;
  let total = 0;
  for (const [index, item] of entries.entries()) {
    for (const [fileIndex, file] of item.attachments.entries()) {
      const data = await readPortfolioFile(file.storageKey);
      total += data.length;
      if (
        data.length !== file.bytes ||
        data.length > MAX_FILE_BYTES ||
        total > MAX_PORTFOLIO_BYTES
      )
        throw new Error("Portfolio attachment size mismatch");
      const folder = `${String(index + 1).padStart(2, "0")}_${safeFileName(item.title, 60)}`;
      files[`${folder}/${fileIndex + 1}_${safeFileName(file.name)}`] = data;
    }
  }
  return zipSync(files, { level: 0 });
}
