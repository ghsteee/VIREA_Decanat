import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  addDays,
  dayMonth,
  mskDate,
  mskDayStart,
  mskTime,
} from "../../src/lib/time";
import { PAIRS } from "../../src/lib/pairs";

const danila = /Студент — Данила/;
const ksenia = /Студентка — Ксения/;
const irina = /Дирекция — Ирина/;
const marat = /Староста — Марат/;
const concept = /Концепт для хакатона\. ВТУ ВИРЭА/;
const db = new PrismaClient();

test.afterAll(() => db.$disconnect());

function newPage(browser: Browser, baseURL: string | undefined) {
  return browser.newPage({ baseURL, viewport: { width: 360, height: 640 } });
}

async function login(page: Page, account: RegExp) {
  await page.goto("/login");
  await expect(page.getByText(concept)).toBeVisible();
  await page.getByRole("button", { name: account }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function expectMobileLayout(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

test("S1: расписание открывается сразу после входа на телефоне", async ({
  page,
}) => {
  await login(page, danila);
  await page.goto("/");
  const board = page.getByRole("table", { name: "Ближайшая пара" });
  await expect(board).toBeVisible();
  await expect(board.getByRole("row").nth(1)).toBeInViewport();
  await expect(page.getByText(concept)).toBeVisible();
  await expectMobileLayout(page);
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Расписание" })).toBeVisible();
  await expectMobileLayout(page);
});

test("S2: перенос виден в расписании и ленте только нужной группы", async ({
  page,
  browser,
  baseURL,
}) => {
  const tomorrow = addDays(mskDate(), 1);
  const lesson = await db.lesson.findFirstOrThrow({
    where: {
      group: { code: "БИСО-03-25" },
      startsAt: {
        gte: mskDayStart(mskDate()),
        lt: mskDayStart(addDays(tomorrow, 7)),
      },
      status: "scheduled",
      format: "offline",
    },
    orderBy: { startsAt: "asc" },
  });
  const reason = `Перенос для проверки ${Date.now()}`;
  await login(page, irina);
  await page.goto(`/staff/schedule/${lesson.id}`);
  await expect(page.getByText(concept)).toBeVisible();
  await expectMobileLayout(page);
  const from = mskDate(lesson.startsAt);
  const day = addDays(from, 1);
  const time = mskTime(lesson.startsAt);
  const pair = Object.entries(PAIRS).find(([, slot]) => slot.start === time);
  if (!pair) throw new Error("В расписании нет номера выбранной пары");
  await page.getByLabel("Дата", { exact: true }).fill(day);
  await page.locator('select[name="pair"]').selectOption(pair[0]);
  await page.getByLabel(/Причина/).fill(reason);
  await page.getByRole("button", { name: "Опубликовать изменение" }).click();
  await expect(page.getByRole("status")).toContainText("Группа уже видит");

  const student = await newPage(browser, baseURL);
  await login(student, danila);
  const move = `${dayMonth(from)} ${time} → ${dayMonth(day)} ${time}`;
  await student.goto(`/schedule?date=${from}`);
  const link = student
    .getByRole("region", { name: "Перенесённые пары" })
    .getByRole("link")
    .filter({ hasText: move });
  await expect(link).toBeVisible();
  await link.click();
  await expect(student.locator(`#lesson-${lesson.id}`)).toContainText(move);
  await student.goto("/feed");
  await expect(student.getByText(reason, { exact: false })).toBeVisible();
  await student.close();

  const otherGroup = await newPage(browser, baseURL);
  await login(otherGroup, ksenia);
  await otherGroup.goto("/feed");
  await expect(otherGroup.getByText(reason, { exact: false })).toHaveCount(0);
  await otherGroup.close();
});

test("S3: новый дедлайн виден группе и получает два напоминания", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Дедлайн для проверки ${Date.now()}`;
  await login(page, irina);
  await page.goto("/staff/announcements");
  await page.getByRole("radio", { name: "Дедлайн" }).check();
  await page.getByLabel("Что сдать").fill(title);
  await page.getByLabel("Срок").fill(`${addDays(mskDate(), 4)}T12:00`);
  await page.getByRole("checkbox", { name: /БИСО-03-25/ }).check();
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Опубликовано");
  const deadline = await db.deadline.findFirstOrThrow({
    where: { title },
    include: { reminders: true },
  });
  expect(deadline.reminders.map((item) => item.offset).sort()).toEqual([
    "d1",
    "d3",
  ]);
  expect(
    deadline.reminders
      .map(
        (item) =>
          (deadline.dueAt.getTime() - item.scheduledAt.getTime()) / 86_400_000,
      )
      .sort(),
  ).toEqual([1, 3]);

  const student = await newPage(browser, baseURL);
  await login(student, danila);
  await expect(student.getByText(title, { exact: true })).toBeVisible();
  await student.close();
});

test("S4 и S9: подача заявки, смена статуса и 404 для другого студента", async ({
  page,
  browser,
  baseURL,
}) => {
  const destination = `Учебная проверка ${Date.now()}`;
  await login(page, danila);
  await page.goto("/requests/new?type=study_certificate");
  await page.getByLabel("Куда нужна справка").fill(destination);
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(page.getByRole("status")).toContainText("Заявка отправлена");
  const requestPath = new URL(page.url()).pathname;
  const id = requestPath.split("/").at(-1);
  expect(id).toMatch(/^[0-9a-f-]{36}$/);

  const staff = await newPage(browser, baseURL);
  await login(staff, irina);
  await staff.goto(`/staff/requests/${id}`);
  await expect(staff.getByText(concept)).toBeVisible();
  await staff.getByRole("radio", { name: "в работе" }).check();
  await staff.getByRole("button", { name: "Сохранить и уведомить" }).click();
  await expect
    .poll(
      async () =>
        (await db.application.findUniqueOrThrow({ where: { id } })).status,
    )
    .toBe("in_progress");
  await staff.close();
  await page.reload();
  await expect(page.locator('[aria-current="step"]')).toContainText("В работе");

  const other = await newPage(browser, baseURL);
  await login(other, ksenia);
  const response = await other.goto(requestPath);
  expect(response?.status()).toBe(404);
  expect(await response?.text()).not.toContain(destination);
  expect((await other.goto("/staff"))?.status()).toBe(404);
  await other.close();
});

test("S6: староста публикует только для своей группы и видит счётчик", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Объявление старосты ${Date.now()}`;
  const chief = await db.user.findUniqueOrThrow({
    where: { login: "m.gainullin" },
    select: { id: true, studentProfile: { select: { groupId: true } } },
  });
  const groupId = chief.studentProfile?.groupId;
  if (!groupId) throw new Error("У демо-старосты нет группы");
  const foreign = await db.lesson.findFirstOrThrow({
    where: { groupId: { not: groupId } },
    select: { id: true },
  });

  await login(page, marat);
  await page.goto("/profile");
  await page.getByRole("link", { name: "Кабинет старосты" }).click();
  await expect(
    page.getByRole("heading", { name: "Староста", exact: true }),
  ).toBeVisible();
  await expectMobileLayout(page);
  expect(
    (await page.goto(`/group-head/schedule/${foreign.id}`))?.status(),
  ).toBe(404);
  await page.goto("/group-head");
  await page.getByRole("radio", { name: "Объявление" }).check();
  await page.getByLabel("Заголовок").fill(title);
  await page.getByLabel("Текст").fill("Собираемся после пары.");
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Опубликовано");

  const notice = await db.notification.findFirstOrThrow({
    where: {
      title,
      announcement: { authorId: chief.id, authorRole: "group_head" },
    },
    include: {
      recipients: { include: { user: { include: { studentProfile: true } } } },
    },
  });
  const total = notice.recipients.length;
  expect(total).toBeGreaterThan(1);
  expect(
    notice.recipients.every((r) => r.user.studentProfile?.groupId === groupId),
  ).toBe(true);
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toContainText(`0 из ${total}`);

  await page.goto("/feed");
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(
    page.getByText("объявление · от старосты", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/group-head");
  await expect(row).toContainText(`1 из ${total}`);

  const outside = await newPage(browser, baseURL);
  await login(outside, danila);
  await outside.goto("/feed");
  await expect(outside.getByText(title, { exact: true })).toHaveCount(0);
  expect((await outside.goto("/group-head"))?.status()).toBe(404);
  await outside.close();
});
