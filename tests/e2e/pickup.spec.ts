import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("A3: студент выбирает свободное окно без пары", async ({ page }) => {
  const { studentProfile: profile } = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
    include: { studentProfile: { include: { group: true } } },
  });
  if (!profile) throw new Error("Нет профиля Данилы");
  const lesson = await db.lesson.findFirstOrThrow({
    where: {
      groupId: profile.groupId,
      status: "scheduled",
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
  });
  const busy = await db.pickupSlot.create({
    data: {
      instituteId: profile.group.instituteId,
      place: "Демо: окно во время пары",
      startsAt: lesson.startsAt,
      endsAt: new Date(lesson.startsAt.getTime() + 10 * 60_000),
    },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/requests/new?type=study_certificate");
  await page.getByLabel("Куда нужна справка").fill("Демо проверки слота");
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("radio", { name: /Забрать в дирекции/ }).check();
  const selector = page.getByLabel("Время выдачи");
  await expect(selector.locator(`option[value="${busy.id}"]`)).toHaveCount(0);
  const free = selector.locator("option").nth(1);
  const id = await free.getAttribute("value");
  const label = await free.textContent();
  if (!id || !label) throw new Error("Сид не дал свободного окна");
  await selector.selectOption(id);
  await page.getByRole("button", { name: "Проверить заявку" }).click();
  await expect(page.getByText(label, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(page.getByRole("status")).toContainText("Заявка отправлена");
  await expect(page.getByText(label, { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      db.pickupReservation.count({
        where: { slotId: id, application: { studentId: profile.id } },
      }),
    )
    .toBe(1);
});
