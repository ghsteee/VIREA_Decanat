import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { mkdir, writeFile } from "node:fs/promises";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
test.use({ reducedMotion: "reduce" });
async function login(page: Page, account = /Студент — Данила/) {
  await page.goto("/login");
  await page.getByRole("button", { name: account }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
const title = "Победа на демо-хакатоне для выгрузки";

test("G4: портфолио сохраняет награду и файл, выгружает PDF и ZIP, позволяет редактировать и удалить", async ({
  page,
}) => {
  await login(page);
  await page.goto("/study/portfolio");
  await page
    .getByText("Добавить работу или достижение", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Вид достижения", exact: true })
    .selectOption("award");
  await page.getByLabel("Название", { exact: true }).fill(title);
  await page
    .getByLabel("Хакатон или мероприятие", { exact: true })
    .fill("Демо-хакатон «Северный код»");
  await page
    .getByRole("textbox", { name: "Описание", exact: true })
    .fill(
      "Разработал прототип сервиса и представил работу команды. Все сведения вымышлены.",
    );
  const content = Buffer.from(
    "Подтверждение вымышленной награды. Portfolio 2026.",
  );
  await page
    .getByLabel("Работы и подтверждения", { exact: false })
    .setInputFiles({
      name: "диплом.txt",
      mimeType: "text/plain",
      buffer: content,
    });
  await page
    .getByRole("button", { name: "Добавить в портфолио", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Портфолио обновлено");
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toContainText("Победа");
  const link = card.getByRole("link", { name: /диплом.txt/ });
  const filePath = (await link.getAttribute("href"))!;
  const file = await page.request.get(filePath);
  expect(file.status()).toBe(200);
  expect(await file.body()).toEqual(content);
  expect(file.headers()["content-disposition"]).toContain("attachment");
  const pdf = await page.request.get("/study/portfolio/export?format=pdf");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/portfolio-check.pdf", await pdf.body());
  const zip = await page.request.get("/study/portfolio/export?format=zip");
  expect(zip.status()).toBe(200);
  const files = unzipSync(await zip.body());
  expect(Object.keys(files)).toContain("portfolio.pdf");
  const attachment = Object.keys(files).find((name) =>
    name.endsWith("диплом.txt"),
  )!;
  expect(attachment).toBeTruthy();
  expect(attachment).not.toContain("..");
  expect(Buffer.from(files[attachment])).toEqual(content);
  await page.screenshot({
    path: test.info().outputPath("portfolio-phone.jpg"),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("portfolio-desktop.jpg"),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await card.getByRole("link", { name: "Редактировать →" }).click();
  await page
    .getByRole("textbox", { name: "Описание", exact: true })
    .fill("Обновлённое описание вымышленной работы.");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(card).toContainText("Обновлённое описание");
  await card.getByRole("link", { name: "Редактировать →" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Удалить запись", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Запись удалена");
  expect((await page.request.get(filePath)).status()).toBe(404);
});

test("G4: неподходящий и слишком большой файл отклоняются без потери полей", async ({
  page,
}) => {
  await login(page);
  await page.goto("/study/portfolio");
  await page
    .getByText("Добавить работу или достижение", { exact: true })
    .click();
  await page
    .getByLabel("Название", { exact: true })
    .fill("Проверка формата вложения");
  const upload = page.getByLabel("Работы и подтверждения", { exact: false });
  await upload.setInputFiles({
    name: "unsafe.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>bad()</script>"),
  });
  await page
    .getByRole("button", { name: "Добавить в портфолио", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Проверь формат",
  );
  await expect(page.getByLabel("Название", { exact: true })).toHaveValue(
    "Проверка формата вложения",
  );
  await upload.setInputFiles({
    name: "large.txt",
    mimeType: "text/plain",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 65),
  });
  await page
    .getByRole("button", { name: "Добавить в портфолио", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "не больше 5 МБ",
  );
  expect(
    await db.portfolioItem.count({
      where: { title: "Проверка формата вложения" },
    }),
  ).toBe(0);
});

test("G4: чужие записи, файлы и подменённый id недоступны; экспорт ограничен владельцем", async ({
  page,
  browser,
  baseURL,
}) => {
  await login(page);
  await page.goto("/study/portfolio");
  await page
    .getByText("Добавить работу или достижение", { exact: true })
    .click();
  const privateTitle = "Личная работа для проверки изоляции";
  await page.getByLabel("Название", { exact: true }).fill(privateTitle);
  await page
    .getByLabel("Работы и подтверждения", { exact: false })
    .setInputFiles({
      name: "personal.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Private fictional work"),
    });
  await page
    .getByRole("button", { name: "Добавить в портфолио", exact: true })
    .click();
  const card = page.getByRole("article").filter({ hasText: privateTitle });
  await expect(card).toBeVisible();
  const editPath = (await card
    .getByRole("link", { name: "Редактировать →" })
    .getAttribute("href"))!;
  const filePath = (await card
    .getByRole("link", { name: /personal.txt/ })
    .getAttribute("href"))!;
  const itemId = editPath.split("/").at(-1)!;
  const other = await browser.newPage({ baseURL });
  try {
    await login(other, /Студентка — Ксения/);
    expect((await other.goto(editPath))?.status()).toBe(404);
    expect((await other.request.get(filePath)).status()).toBe(404);
    const exported = await other.request.get(
      `/study/portfolio/export?format=zip&studentId=${itemId}`,
    );
    expect(exported.status()).toBe(200);
    expect(
      Object.keys(unzipSync(await exported.body())).some((name) =>
        name.includes("personal.txt"),
      ),
    ).toBe(false);
    await other.goto("/study/portfolio");
    await other.getByRole("link", { name: "Редактировать →" }).first().click();
    await expect(
      other.getByRole("heading", { name: "Редактировать запись" }),
    ).toBeVisible();
    const ownId = new URL(other.url()).pathname.split("/").at(-1)!;
    // Подмена непосредственно отправляемого HTTP-тела, а не управляемого React input.
    await other.route("**/study/portfolio/**", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postDataBuffer()!.toString("utf8");
      expect(body).toContain(ownId);
      await route.continue({ postData: body.replaceAll(ownId, itemId) });
    });
    await other.getByRole("button", { name: "Сохранить изменения" }).click();
    await expect(
      other.getByRole("heading", { name: "Страница не найдена" }),
    ).toBeVisible();
    expect(
      (await db.portfolioItem.findUniqueOrThrow({ where: { id: itemId } }))
        .title,
    ).toBe(privateTitle);
    const staff = await browser.newPage({ baseURL });
    try {
      await login(staff, /Дирекция — Ирина/);
      expect((await staff.goto("/study/portfolio"))?.status()).toBe(404);
    } finally {
      await staff.close();
    }
  } finally {
    await other.close();
    await page.goto(editPath);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Удалить запись", exact: true })
      .click();
  }
});
