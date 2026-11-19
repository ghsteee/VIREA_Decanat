import { expect, test } from "@playwright/test";

test("S5: Ксения видит работы, ближайший срок и недостающие баллы", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/study");
  await expect(page.getByRole("heading", { name: "Учёба" })).toBeVisible();
  const databases = page
    .getByRole("rowgroup")
    .filter({ hasText: "Базы данных" });
  await expect(databases).toContainText("риск");
  await expect(databases).toContainText("3 из 5 лаб");
  await expect(databases).toContainText("Лаба 4");
  await expect(databases).toContainText("Лаба 5");
  await expect(databases).toContainText("До 50 баллов не хватает 2");
  await expect(page.getByText(/Ближайший срок — 06.12/)).toBeVisible();
  await expect(
    page.getByText("Чек-лист допуска · выполнен").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
