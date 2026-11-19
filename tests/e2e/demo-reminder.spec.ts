import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { addDays, mskDate } from "../../src/lib/time";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("E4: демо-напоминание появляется в ленте и сохраняет запланированные сроки", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Демо-срок ${Date.now()}`;
  await page.goto("/login");
  await page.getByRole("button", { name: /Дирекция — Ирина/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/staff/announcements");
  await page.getByLabel("Что сдать").fill(title);
  await page.getByLabel("Срок").fill(`${addDays(mskDate(), 4)}T12:00`);
  await page.getByRole("checkbox", { name: /БИСО-03-25/ }).check();
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Опубликовано");

  const item = page
    .getByRole("region", { name: "Демо-напоминания" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await item
    .getByRole("button", { name: "Отправить напоминание сейчас" })
    .click();
  await expect(page.getByRole("status")).toContainText("поставлено в очередь");
  await expect(item).toContainText("уже создано");
  const deadline = await db.deadline.findFirstOrThrow({
    where: { title },
    include: { reminders: true, notifications: true },
  });
  expect(deadline.reminders.map((r) => r.offset).sort()).toEqual(["d1", "d3"]);
  expect(
    deadline.notifications.filter((n) => n.kind === "deadline_reminder"),
  ).toHaveLength(1);

  const student = await browser.newPage({
    baseURL,
    viewport: { width: 360, height: 640 },
  });
  await student.goto("/login");
  await student.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(student).not.toHaveURL(/\/login$/);
  await student.goto("/feed?f=deadlines");
  await expect(
    student.getByText(`Напоминание: ${title}`, { exact: true }),
  ).toBeVisible();
  await student.close();
});
