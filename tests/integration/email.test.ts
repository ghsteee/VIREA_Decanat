import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import nodemailer from "nodemailer";
import { sendEmail } from "../../src/server/email";

test("N2: зависший SMTP завершается до окончания аренды очереди", async (context) => {
  const values = {
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "465",
    SMTP_USER: "fixture",
    SMTP_PASSWORD: randomBytes(16).toString("hex"),
    SMTP_FROM: "sender@example.test",
    DOMAIN: "cabinet.example.test",
    EMAIL_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    EMAIL_CODE_HMAC_KEY: randomBytes(32).toString("hex"),
    DEMO_LOGIN: "on",
    EMAIL_TEST_RECIPIENTS: "student@example.test",
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  let closed = 0;
  const transport = {
    sendMail: () => new Promise<never>(() => {}),
    close: () => {
      closed++;
    },
  } as unknown as ReturnType<typeof nodemailer.createTransport>;
  context.mock.method(nodemailer, "createTransport", () => transport);
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const sending = sendEmail({ to: "student@example.test", code: "000000" });
  context.mock.timers.tick(20_000);
  assert.equal(await sending, "retry");
  assert.equal(closed, 1);
});
