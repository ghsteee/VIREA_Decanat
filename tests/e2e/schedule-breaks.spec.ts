import { expect, test } from "@playwright/test";
import { addDays, dayMonth, mskDate, weekStart } from "../../src/lib/time";

test("R2: перерывы 10 и 30 минут видны в дне и неделе", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  const monday = addDays(weekStart(mskDate()), 7);
  for (const suffix of ["", "&view=week"]) {
    await page.goto(`/schedule?date=${monday}${suffix}`);
    const table = page.getByRole("table", {
      name: `Пары, понедельник ${dayMonth(monday)}`,
      exact: true,
    });
    await expect(
      table.getByText("Перерыв · 10 мин", { exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByText("Перерыв · 30 мин", { exact: true }),
    ).toHaveCount(1);
    await expect(table).toContainText("10:30–10:40");
    await expect(table).toContainText("12:10–12:40");
  }
});
