import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { mskDate } from "../../src/lib/time";

const db = new PrismaClient();
test.use({ reducedMotion: "reduce" });
test.afterAll(() => db.$disconnect());
async function login(page: Page, account: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name: account }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function fixture() {
  const now = new Date();
  const term = await db.academicTerm.findFirstOrThrow({
    where: { startsOn: { lte: now }, endsOn: { gte: now } },
  });
  const assessment = await db.assessment.findFirstOrThrow({
    where: {
      group: { code: "БИСО-03-25" },
      termId: term.id,
      subject: { name: "Базы данных" },
      kind: { in: ["exam", "credit"] },
    },
  });
  return { term, assessment };
}

test("G1: форма контроля только внутри предмета, без данных другой группы и прошлого семестра", async ({
  page,
}) => {
  const { term, assessment } = await fixture();
  const previous = await db.academicTerm.findFirstOrThrow({
    where: { endsOn: { lt: term.startsOn } },
  });
  const other = await db.group.findFirstOrThrow({
    where: { id: { not: assessment.groupId } },
  });
  const subject = await db.subject.create({
    data: { name: "Учебная дисциплина для проверки" },
  });
  const ids = Array.from({ length: 5 }, () => randomUUID());
  const common = {
    subjectId: subject.id,
    groupId: assessment.groupId,
    termId: term.id,
  };
  try {
    await db.assessment.createMany({
      data: [
        { ...common, id: ids[0], kind: "lab", title: "Обязательная работа" },
        {
          ...common,
          id: ids[1],
          groupId: other.id,
          kind: "credit",
          title: "Зачёт другой группы",
        },
        {
          ...common,
          id: ids[2],
          termId: previous.id,
          kind: "credit",
          title: "Прошлый зачёт",
        },
      ],
    });
    await login(page, /Студент — Данила/);
    await page.goto("/study");
    const card = page.getByRole("button", { name: subject.name, exact: true });
    await expect(card.getByText(/Экзамен|Зачёт|Форма контроля/)).toHaveCount(0);
    await card.click();
    let dialog = page.getByRole("dialog", { name: subject.name });
    await expect(dialog).toContainText("Форма контроля уточняется");
    await page.keyboard.press("Escape");
    await db.assessment.createMany({
      data: [
        { ...common, id: ids[3], kind: "exam", title: "Экзамен" },
        { ...common, id: ids[4], kind: "exam", title: "Повторная аттестация" },
      ],
    });
    await page.reload();
    await card.click();
    dialog = page.getByRole("dialog", { name: subject.name });
    await expect(
      dialog.getByLabel("Форма контроля: Экзамен", { exact: true }),
    ).toHaveCount(1);
    await expect(
      dialog.getByLabel("Форма контроля: Зачёт", { exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await db.assessment.delete({ where: { id: ids[4] } });
    await db.assessment.update({
      where: { id: ids[3] },
      data: { kind: "credit", title: "Зачёт" },
    });
    await page.reload();
    await card.click();
    await expect(
      page
        .getByRole("dialog")
        .getByLabel("Форма контроля: Зачёт", { exact: true }),
    ).toBeVisible();
  } finally {
    await db.assessment.deleteMany({ where: { id: { in: ids } } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});

test("E2 и G1: дирекция меняет форму и расписание сессии, студент видит результат, устаревшая форма не перезаписывает его", async ({
  page,
  context,
  baseURL,
}) => {
  const { term, assessment } = await fixture();
  const route = `/staff/session?group=${assessment.groupId}&term=${term.id}`;
  const date = mskDate(term.sessionStartsOn!);
  const stale = await context.newPage();
  try {
    await login(page, /Дирекция — Ирина/);
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Расписание сессии" }),
    ).toBeVisible();
    const card = page
      .locator("details")
      .filter({ hasText: "Базы данных" })
      .first();
    await card.locator("summary").click();
    await stale.goto(route);
    const staleCard = stale
      .locator("details")
      .filter({ hasText: "Базы данных" })
      .first();
    await staleCard.locator("summary").click();
    await card
      .getByRole("combobox", { name: "Форма контроля", exact: true })
      .selectOption("exam");
    await card.getByLabel("Дата", { exact: true }).fill(date);
    await card.getByLabel("Время начала (МСК)").fill("09:30");
    await card.getByLabel("Аудитория", { exact: true }).fill("А-305");
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(card.getByRole("status")).toContainText("Сохранено");
    await expect(
      card.getByRole("combobox", { name: "Форма контроля", exact: true }),
    ).toHaveValue("exam");
    await staleCard.getByLabel("Аудитория", { exact: true }).fill("В-999");
    await staleCard
      .getByRole("button", { name: "Сохранить", exact: true })
      .click();
    await expect(staleCard.getByRole("alert")).toContainText("уже изменили");
    const saved = await db.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(saved.sessionStartsAt?.toISOString()).toBe(`${date}T06:30:00.000Z`);
    expect(saved.sessionRoom).toBe("А-305");
    expect(saved.kind).toBe("exam");
    await page.screenshot({
      path: test.info().outputPath("staff-session-phone.jpg"),
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });
    await card
      .getByRole("combobox", { name: "Форма контроля", exact: true })
      .selectOption("credit");
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await db.assessment.findUniqueOrThrow({
              where: { id: assessment.id },
            })
          ).kind,
      )
      .toBe("credit");
    await card.getByLabel("Дата", { exact: true }).fill("");
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(card.getByRole("alert")).toContainText("укажи дату");
    await card.getByLabel("Дата", { exact: true }).fill(date);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("staff-session-desktop.jpg"),
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });
    const student = await context
      .browser()!
      .newPage({
        viewport: { width: 360, height: 900 },
        baseURL,
        reducedMotion: "reduce",
      });
    try {
      await login(student, /Студент — Данила/);
      await student.goto("/study");
      const trigger = student.getByRole("button", {
        name: "Базы данных",
        exact: true,
      });
      await expect(trigger.getByText(/Экзамен|Зачёт/)).toHaveCount(0);
      await trigger.click();
      const dialog = student.getByRole("dialog", { name: "Базы данных" });
      await expect(
        dialog.getByLabel("Форма контроля: Зачёт", { exact: true }),
      ).toBeVisible();
      await student.screenshot({
        path: test.info().outputPath("student-control-dialog.jpg"),
        type: "jpeg",
        quality: 85,
        fullPage: true,
      });
      await student.goto("/schedule?view=session");
      const entry = student
        .getByRole("list", { name: "Экзамены и зачёты" })
        .locator("li")
        .filter({ hasText: "Базы данных" });
      await expect(entry).toContainText("Зачёт");
      await expect(entry).toContainText("09:30");
      await expect(entry).toContainText("А-305");
      await expect(entry.locator("time")).toHaveAttribute("datetime", date);
      await student.screenshot({
        path: test.info().outputPath("student-session-phone.jpg"),
        type: "jpeg",
        quality: 85,
        fullPage: true,
      });
      expect((await student.goto(route))?.status()).toBe(404);
    } finally {
      await student.close();
    }
  } finally {
    await stale.close();
    await db.assessment.update({
      where: { id: assessment.id },
      data: {
        kind: assessment.kind,
        title: assessment.title,
        heldOn: assessment.heldOn,
        sessionStartsAt: assessment.sessionStartsAt,
        sessionRoom: assessment.sessionRoom,
        sessionVersion: assessment.sessionVersion,
      },
    });
  }
});

test("E2: можно назначить форму без даты и повторно сохранить без дубля", async ({
  page,
}) => {
  const { term, assessment } = await fixture();
  const subject = await db.subject.create({
    data: { name: "Новая дисциплина для аттестации" },
  });
  await db.assessment.create({
    data: {
      groupId: assessment.groupId,
      subjectId: subject.id,
      termId: term.id,
      kind: "lab",
      title: "Работа",
    },
  });
  try {
    await login(page, /Дирекция — Ирина/);
    await page.goto(
      `/staff/session?group=${assessment.groupId}&term=${term.id}`,
    );
    const card = page
      .locator("details")
      .filter({ hasText: subject.name })
      .first();
    await card.locator("summary").click();
    await card
      .getByRole("combobox", { name: "Форма контроля", exact: true })
      .selectOption("credit");
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(card.getByRole("status")).toContainText("Сохранено");
    await card.getByLabel("Аудитория", { exact: true }).fill("Б-201");
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await db.assessment.findFirstOrThrow({
              where: { subjectId: subject.id, kind: "credit" },
            })
          ).sessionRoom,
      )
      .toBe("Б-201");
    expect(
      await db.assessment.count({
        where: { subjectId: subject.id, kind: "credit" },
      }),
    ).toBe(1);
    expect(
      (
        await db.assessment.findFirstOrThrow({
          where: { subjectId: subject.id, kind: "credit" },
        })
      ).heldOn,
    ).toBeNull();
  } finally {
    await db.assessment.deleteMany({ where: { subjectId: subject.id } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});

test("E2: чужой институт недоступен в редакторе и при подмене формы", async ({
  page,
}) => {
  const { term, assessment } = await fixture();
  const institute = await db.institute.create({
    data: {
      code: `T-${randomUUID()}`,
      name: "Вымышленный институт для проверки",
    },
  });
  const group = await db.group.create({
    data: {
      instituteId: institute.id,
      code: `ТЕСТ-${randomUUID()}`,
      course: 1,
    },
  });
  const foreign = await db.assessment.create({
    data: {
      groupId: group.id,
      subjectId: assessment.subjectId,
      termId: term.id,
      kind: "exam",
      title: "Экзамен",
    },
  });
  try {
    await login(page, /Дирекция — Ирина/);
    expect(
      (await page.goto(`/staff/session?group=${group.id}`))?.status(),
    ).toBe(404);
    await page.goto(
      `/staff/session?group=${assessment.groupId}&term=${term.id}`,
    );
    await expect(
      page
        .getByRole("combobox", { name: "Группа", exact: true })
        .locator(`option[value="${group.id}"]`),
    ).toHaveCount(0);
    const card = page
      .locator("details")
      .filter({ hasText: "Базы данных" })
      .first();
    await card.locator("summary").click();
    await card.getByLabel("Аудитория", { exact: true }).fill("Подмена");
    await card.locator("form").evaluate(
      (form, ids) => {
        form.addEventListener("formdata", (event) => {
          const data = (event as FormDataEvent).formData;
          data.set("groupId", ids.groupId);
          data.set("assessmentId", ids.assessmentId);
        });
      },
      { groupId: group.id, assessmentId: foreign.id },
    );
    await card.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Страница не найдена", exact: true }),
    ).toBeVisible();
    expect(
      (await db.assessment.findUniqueOrThrow({ where: { id: foreign.id } }))
        .sessionRoom,
    ).toBeNull();
  } finally {
    await db.assessment.delete({ where: { id: foreign.id } });
    await db.group.delete({ where: { id: group.id } });
    await db.institute.delete({ where: { id: institute.id } });
  }
});
