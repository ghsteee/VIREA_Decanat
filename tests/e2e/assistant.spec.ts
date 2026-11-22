import { expect, test } from "@playwright/test";

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
  await expect(page.getByText(/Помощник сейчас недоступен/)).toBeVisible();
  await page.getByRole("link", { name: "Открыть демо-положение" }).click();
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
