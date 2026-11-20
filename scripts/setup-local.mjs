import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const databasePassword = randomBytes(24).toString("hex");
const values = {
  POSTGRES_PASSWORD: databasePassword,
  DATABASE_URL: `postgresql://dekanych:${databasePassword}@127.0.0.1:5434/dekanych`,
  SESSION_SECRET: randomBytes(32).toString("hex"),
  SEED_PASSWORD: randomBytes(24).toString("hex"),
  DEMO_LOGIN: "on",
};
const template = await readFile(new URL(".env.example", root), "utf8");
const content = template.replace(/^(\w+)=(.*)$/gm, (line, key) =>
  Object.hasOwn(values, key) ? `${key}=${values[key]}` : line,
);
try {
  await writeFile(new URL(".env", root), content, { flag: "wx", mode: 0o600 });
  console.log("Создан локальный .env. Секреты сохранены только в нём.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(
    ".env уже существует. Проверь настройки локальной базы по README.",
  );
}
console.log(`Проект: ${fileURLToPath(root)}`);
console.log("Дальше: docker compose -f compose.local.yml up -d --wait");
console.log("Затем: npm run db:deploy, npm run db:seed, npm run dev");
