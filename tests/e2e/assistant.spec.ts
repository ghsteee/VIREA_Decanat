import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { addDays, mskDate } from "../../src/lib/time";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("AI2: черновик редактируется до отправки, а правила открываются по номеру пункта", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/assistant");
  await page
    .getByLabel("Твой вопрос")
    .fill("Сколько баллов нужно для допуска?");
  await page.getByRole("button", { name: "Спросить", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Пункт 3\.1/ })).toBeVisible();
  await page.getByRole("link", { name: /^Пункт 3\.1/ }).click();
  await expect(page.locator("#p-3-1")).toBeVisible();

  await page.goto("/assistant");
  await page.getByLabel("Твой вопрос").fill("Нужна справка в военкомат");
  await page.getByRole("button", { name: "Спросить", exact: true }).click();
  await page.getByRole("link", { name: /Проверить черновик/ }).click();
  await expect(page.getByLabel("Военкомат")).toHaveValue(
    "Военкомат по месту учёта",
  );
  const destination = page.getByLabel("Военкомат");
  await destination.fill("Тестовый военкомат");
  for (const name of ["Далее", "Проверить заявку"]) {
    const button = page.getByRole("button", { name, exact: true });
    if (await button.isVisible()) await button.click();
  }
  await expect(
    page.getByText("Тестовый военкомат", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Отправить заявку" }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /\/requests\/new\?type=military_certificate&draft=assistant$/,
  );
});

test("AI1: помощник на «Сегодня» объясняет долги и допуск разговорными формулировками", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByText("ИИ-помощник", { exact: true }).click();
  const input = page.getByLabel("Твой вопрос");
  const ask = page.getByRole("button", { name: "Спросить", exact: true });
  const answer = page.locator('[aria-live="polite"]');

  await input.fill("По каким предметам у меня хвосты?");
  await ask.click();
  await expect(answer).toContainText("Базы данных — Риск недопуска.");
  await expect(answer).toContainText("Лаба 4");

  await input.fill("Что мне нужно сдать для допуска по БД?");
  await ask.click();
  await expect(answer).toContainText("Допуск к сессии");
  await expect(answer).toContainText("До 50 баллов не хватает 2.");
  await expect(answer).toContainText("Лаба 4");
  await expect(
    answer.getByRole("link", { name: "Открыть учёбу" }),
  ).toHaveAttribute("href", "/study");
  await expect(page).toHaveURL(/\/$/);
  await page.locator("details", { has: input }).screenshot({
    path: testInfo.outputPath("today-assistant-360.jpg"),
    animations: "disabled",
    quality: 88,
  });
});

test("AI1 и AI3: помощник отвечает по расписанию и оценкам текущего студента", async ({
  page,
}) => {
  const student = await db.studentProfile.findFirstOrThrow({
    where: { user: { login: "k.lavrova" } },
  });
  const lesson = await db.lesson.findFirstOrThrow({
    where: { groupId: student.groupId },
    include: { subject: true },
  });
  const tomorrow = addDays(mskDate(), 1);
  const scheduled = await db.lesson.create({
    data: {
      groupId: student.groupId,
      termId: lesson.termId,
      subjectId: lesson.subjectId,
      kind: "lecture",
      startsAt: new Date(`${tomorrow}T08:05:00+03:00`),
      endsAt: new Date(`${tomorrow}T08:50:00+03:00`),
    },
  });
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto("/assistant");
    const input = page.getByLabel("Твой вопрос");
    const ask = page.getByRole("button", { name: "Спросить", exact: true });

    await input.fill("Какие у меня пары завтра?");
    await ask.click();
    await expect(
      page.getByText(`08:05–08:50 — ${lesson.subject.name}`, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Открыть расписание", exact: true }),
    ).toHaveAttribute("href", `/schedule?date=${tomorrow}`);

    await input.fill("Сколько у меня баллов по базам данных?");
    await ask.click();
    await expect(
      page.locator('[aria-live="polite"]').getByText(/48/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Открыть учёбу" }),
    ).toHaveAttribute("href", "/study");

    await input.fill("Сколько у меня баллов по ботанике?");
    await ask.click();
    await expect(
      page.getByText("Ответ не найден.", { exact: true }),
    ).toBeVisible();
  } finally {
    await db.lesson.delete({ where: { id: scheduled.id } });
  }
});

test("AI1 и AI3: готовность своей справки и скрытие чужой заявки по номеру", async ({
  page,
}) => {
  const own = await db.application.findUniqueOrThrow({
    where: { number: 187 },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/assistant");
  await page
    .getByLabel("Твой вопрос")
    .fill("Готова ли моя справка об обучении?");
  await page.getByRole("button", { name: "Спросить", exact: true }).click();
  await expect(
    page.getByText(/Справка об обучении №0187.*готова/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Открыть заявку", exact: true }),
  ).toHaveAttribute("href", `/requests/${own.id}`);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/assistant");
  await page.getByLabel("Твой вопрос").fill("Какой статус заявки №0187?");
  await page.getByRole("button", { name: "Спросить", exact: true }).click();
  await expect(
    page.getByText("Ответ не найден.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Открыть заявку", exact: true }),
  ).toHaveCount(0);
});
