import { expect, test } from "@playwright/test";
import { addDays, dayMonth, mskDate, weekStart } from "../../src/lib/time";

test.use({ hasTouch: true });

test("R1: на 360 px свайп переключает дни, включая воскресенье", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Сенсорные жесты передаёт Chromium CDP",
  );

  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  const saturday = addDays(weekStart(mskDate()), 5);
  const sunday = addDays(saturday, 1);
  const monday = addDays(sunday, 1);
  await page.goto(`/schedule?date=${saturday}`);

  const session = await context.newCDPSession(page);
  const surface = page.getByTestId("schedule-swipe");
  async function swipe(from: number, to: number) {
    const box = await surface.boundingBox();
    if (!box) throw new Error("Не видна область расписания");
    const y = Math.round(box.y + 14);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: from, y }],
    });
    for (const ratio of [0.25, 0.5, 0.75, 1]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: Math.round(from + (to - from) * ratio), y }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }

  await swipe(270, 75);
  await expect(page).toHaveURL(new RegExp(`date=${sunday}$`));
  await expect(
    page.getByRole("link", {
      name: new RegExp(`воскресенье, ${dayMonth(sunday)}`),
    }),
  ).toHaveAttribute("aria-current", "date");

  await swipe(270, 75);
  await expect(page).toHaveURL(new RegExp(`date=${monday}$`));
  await swipe(75, 270);
  await expect(page).toHaveURL(new RegExp(`date=${sunday}$`));

  // Новый документ отделяет проверки кнопок от последовательности CDP-касаний.
  await page.reload();
  const dayLinks = page
    .getByRole("navigation", { name: "Дни недели" })
    .getByRole("link");
  await expect(dayLinks).toHaveCount(7);
  for (const item of await dayLinks.all()) {
    const box = await item.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await dayLinks.first().click();
  await expect(page).toHaveURL(new RegExp(`date=${weekStart(sunday)}$`));
  await page.getByRole("link", { name: "Следующая неделя" }).click();
  await expect(page).toHaveURL(new RegExp(`date=${monday}$`));
});
