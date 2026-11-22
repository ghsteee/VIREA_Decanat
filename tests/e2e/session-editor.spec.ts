import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mskDate } from "../../src/lib/time";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("E2: дирекция назначает экзамен, а студент видит время и аудиторию", async ({
  page,
  browser,
  baseURL,
}) => {
  const group = await db.group.findUniqueOrThrow({
    where: { code: "БИСО-03-25" },
  });
  const term = await db.academicTerm.findFirstOrThrow({
    where: {
      endsOn: { gte: new Date(mskDate()) },
      startsOn: { lte: new Date(mskDate()) },
    },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /Дирекция — Ирина/ }).click();
  await page.waitForURL("/staff");
  await page.goto(`/staff/session?group=${group.id}&term=${term.id}`);
  const subject = page.getByRole("link", { name: /^Компьютерные сети/ });
  await subject.click();
  const duringSession = mskDate(term.sessionStartsOn ?? term.endsOn);
  await page.getByLabel("Форма контроля").selectOption("exam");
  await page.getByLabel("Дата", { exact: true }).fill(duringSession);
  await page.getByLabel(/Время начала/).fill("11:15");
  await page.getByLabel("Аудитория").fill("А-416");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Сохранено");
  await page.getByLabel("Аудитория").fill("А-417");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Сохранено");

  const student = await browser.newPage({ baseURL });
  try {
    await student.goto("/login");
    await student.getByRole("button", { name: /Студент — Данила/ }).click();
    await student.waitForURL("/");
    await student.goto("/schedule?view=session");
    const exam = student
      .getByRole("listitem")
      .filter({ hasText: "Компьютерные сети" });
    await expect(exam).toHaveCount(1);
    await expect(exam).toContainText("11:15");
    await expect(exam).toContainText("А-417");
    expect((await student.goto("/staff/session"))?.status()).toBe(404);
  } finally {
    await student.close();
    await db.assessment.deleteMany({
      where: {
        groupId: group.id,
        termId: term.id,
        kind: "exam",
        sessionRoom: { in: ["А-416", "А-417"] },
        subject: { name: "Компьютерные сети" },
      },
    });
  }
});
