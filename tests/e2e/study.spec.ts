import { expect, test } from "@playwright/test";
import { PrismaClient, type AssessmentKind } from "@prisma/client";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("S5: Ксения видит работы, ближайший срок и недостающие баллы", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/study");
  await expect(page.getByRole("heading", { name: "Учёба" })).toBeVisible();
  const trigger = page.getByRole("button", {
    name: "Базы данных",
    exact: true,
  });
  await expect(trigger.locator("svg g")).toHaveCount(3);
  await expect(trigger).not.toContainText("Посещения");
  const cards = page.getByRole("list", { name: "Карточки дисциплин" });
  expect(
    await cards.evaluate(
      (el) =>
        el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
    ),
  ).toBe(true);
  await expect(cards.getByRole("img", { name: /Рейтинг:/ })).toHaveCount(0);
  await expect(cards).not.toContainText("/ 100");
  await trigger.click();
  const databases = page.getByRole("dialog", { name: "Базы данных" });
  await expect(databases).toContainText("Риск недопуска");
  await expect(
    databases.getByRole("img", { name: "Рейтинг: 48 из 100" }),
  ).toBeVisible();
  await expect(
    databases.getByText("до 06.12", { exact: true }).first(),
  ).toBeVisible();
  await expect(databases.getByText("Посещения", { exact: true })).toBeVisible();
  await expect(
    databases.getByText("Работы", { exact: true }).locator(".."),
  ).toContainText("4 из 6");
  await expect(
    databases.getByText("Доп. достижения", { exact: true }).locator(".."),
  ).toContainText("1 из 2");

  await expect(databases).toContainText("Разобрать план запроса на семинаре");
  await expect(databases).not.toContainText(
    "Решить дополнительную задачу по индексам",
  );
  await expect(databases).toContainText("3 из 5 лаб");
  await expect(databases).toContainText("Лаба 4");
  await expect(databases).toContainText("Лаба 5");
  await expect(databases).toContainText("До 50 баллов не хватает 2");
  await databases.getByText("Оценки по работам и аттестациям").click();
  await expect(databases.getByText("12 из 25 баллов")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(databases).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByText(/Ближайший срок —/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await test.step("Средний балл за последнюю сессию отдельно от среднего за всё время", async () => {
    const student = await db.studentProfile.findFirstOrThrow({
      where: { user: { login: "k.lavrova" } },
    });
    const subject = await db.subject.findFirstOrThrow({
      where: { name: "Базы данных" },
    });
    const term = await db.academicTerm.create({
      data: {
        name: "Демонстрационный прошлый семестр",
        startsOn: new Date("2025-09-01"),
        endsOn: new Date("2026-01-31"),
      },
    });
    try {
      const results: { kind: AssessmentKind; value: number | null }[] = [
        { kind: "exam", value: 2 },
        { kind: "lab", value: 2 },
        { kind: "exam", value: null },
      ];
      for (const { kind, value } of results) {
        await db.assessment.create({
          data: {
            groupId: student.groupId,
            termId: term.id,
            subjectId: subject.id,
            kind,
            title: "Проверка расчёта среднего балла",
            results: {
              create: { studentId: student.id, scale: "grade5", value },
            },
          },
        });
      }
      await page.reload();
      const last = page.getByRole("img", {
        name: "Средний балл за последнюю закрытую сессию: 4,6",
      });
      await expect(last).toBeVisible();
      await expect(last).toHaveText("4,6");
      await expect(last.locator("span")).toHaveCount(0);
      await expect(
        page.getByText("За всё время 4,2", { exact: true }),
      ).toBeVisible();
    } finally {
      await db.assessmentResult.deleteMany({
        where: { assessment: { termId: term.id } },
      });
      await db.assessment.deleteMany({ where: { termId: term.id } });
      await db.academicTerm.delete({ where: { id: term.id } });
    }
  });
});

test("G1: поиск по названию дисциплины, открытие результата и сброс", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/study");
  const cards = page.getByRole("list", { name: "Карточки дисциплин" });
  await expect(cards).toBeVisible();
  const buttons = cards.getByRole("button");
  const initialNames = await buttons.allTextContents();
  expect(initialNames.length).toBeGreaterThan(1);
  const search = page.getByRole("searchbox", { name: "Поиск по дисциплинам" });
  await search.fill("теорвер");
  await expect(buttons).toHaveText(["Теория вероятностей"]);
  await search.fill("  ЗЫ   Дан  ");
  await expect(buttons).toHaveCount(1);
  const result = buttons.filter({ hasText: "Базы данных" });
  await result.press("Enter");
  await expect(page.getByRole("dialog", { name: "Базы данных" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(result).toBeFocused();
  await expect(search).toHaveValue("  ЗЫ   Дан  ");
  await search.fill("несуществующий предмет");
  await expect(buttons).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Дисциплин с таким названием нет" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(buttons).toHaveText(initialNames);
});
