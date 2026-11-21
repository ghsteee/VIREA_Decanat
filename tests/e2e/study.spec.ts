import { expect, test } from "@playwright/test";

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
  await trigger.click();
  const databases = page.getByRole("dialog", { name: "Базы данных" });
  await expect(databases).toContainText("Риск недопуска");
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
  await expect(page.getByText(/Ближайший срок — 06.12/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
