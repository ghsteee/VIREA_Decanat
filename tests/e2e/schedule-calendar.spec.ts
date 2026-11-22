import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { calendarMonth } from "../../src/lib/calendar-month";
import { mskDate, mskDayStart } from "../../src/lib/time";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test("R1: месячный календарь листается и открывает день с клавиатуры", async ({
  page,
}) => {
  const month = calendarMonth(mskDate());
  await login(page);
  await page.goto(`/schedule?date=${mskDate()}&view=month`);
  const grid = page.getByRole("navigation", { name: "Календарь на месяц" });
  await expect(grid.getByRole("link")).toHaveCount(month.days.length);
  await page
    .getByRole("link", { name: "Следующий месяц", exact: true })
    .click();
  await expect(page.locator("#schedule-period")).toHaveText(
    calendarMonth(month.next).title,
  );
  await page
    .getByRole("link", { name: "Предыдущий месяц", exact: true })
    .click();
  await expect(page.locator("#schedule-period")).toHaveText(month.title);
  const lesson = await db.lesson.findFirstOrThrow({
    where: {
      group: { code: "БИСО-03-25" },
      startsAt: { gte: mskDayStart(month.first), lt: mskDayStart(month.next) },
    },
  });
  const date = mskDate(lesson.startsAt);
  const day = grid.locator(`a[href="/schedule?date=${date}"]`);
  await day.focus();
  await day.press("Enter");
  await expect(page).toHaveURL(new RegExp(`date=${date}$`));
  await expect(page.locator(`#lesson-${lesson.id}`)).toBeVisible();
});

test("R2: типы занятий написаны полностью", async ({ page }) => {
  await login(page);
  for (const [kind, label] of [
    ["practice", "практическое занятие"],
    ["lab", "лабораторная работа"],
  ] as const) {
    const lesson = await db.lesson.findFirstOrThrow({
      where: { group: { code: "БИСО-03-25" }, kind },
    });
    await page.goto(`/schedule?date=${mskDate(lesson.startsAt)}`);
    await expect(page.locator(`#lesson-${lesson.id}`)).toContainText(label);
  }
});

test("R1: в сессии только экзамены и зачёты своей группы текущего семестра", async ({
  page,
}) => {
  const now = new Date();
  const term = await db.academicTerm.findFirstOrThrow({
    where: { startsOn: { lte: now }, endsOn: { gte: now } },
  });
  const own = await db.assessment.findFirstOrThrow({
    where: { group: { code: "БИСО-03-25" }, termId: term.id },
  });
  const other = await db.group.findFirstOrThrow({
    where: { id: { not: own.groupId } },
  });
  const key = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  try {
    await db.assessment.createMany({
      data: [
        {
          id: ids[0],
          groupId: own.groupId,
          subjectId: own.subjectId,
          termId: term.id,
          kind: "exam",
          title: `Свой экзамен ${key}`,
          heldOn: term.sessionStartsOn,
        },
        {
          id: ids[1],
          groupId: own.groupId,
          subjectId: own.subjectId,
          termId: term.id,
          kind: "credit",
          title: `Свой зачёт ${key}`,
        },
        {
          id: ids[2],
          groupId: other.id,
          subjectId: own.subjectId,
          termId: term.id,
          kind: "exam",
          title: `Чужой экзамен ${key}`,
          heldOn: term.sessionStartsOn,
        },
      ],
    });
    await login(page);
    await page.goto("/schedule?view=session");
    await expect(
      page.getByRole("heading", { name: "Расписание сессии" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Свой экзамен ${key}`, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText(`Свой зачёт ${key}`, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText(`Чужой экзамен ${key}`, { exact: false }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Проверить допуск" }).click();
    await expect(page).toHaveURL(/\/study$/);
  } finally {
    await db.assessment.deleteMany({ where: { id: { in: ids } } });
  }
});
