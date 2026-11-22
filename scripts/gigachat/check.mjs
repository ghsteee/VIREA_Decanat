import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request } from "node:https";
import { rootCertificates } from "node:tls";

const key = process.env.GIGACHAT_AUTH_KEY?.trim();
const bundle = process.env.GIGACHAT_CA_BUNDLE?.trim();
const scope = process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
const model = process.env.GIGACHAT_MODEL || "GigaChat-2-Pro";

function json(url, ca, { headers, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        ca,
        method: body ? "POST" : "GET",
        minVersion: "TLSv1.2",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Accept: "application/json",
          ...headers,
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (response) => {
        response.once("error", reject);
        if (response.statusCode !== 200) {
          response.resume();
          return reject(
            Object.assign(new Error("HTTP"), {
              code: "HTTP_" + response.statusCode,
            }),
          );
        }
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
          if (data.length > 65_536)
            response.destroy(new Error("Ответ слишком большой"));
        });
        response.once("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(Object.assign(new Error("JSON"), { code: "INVALID_JSON" }));
          }
        });
      },
    );
    req.once("error", reject);
    req.end(body);
  });
}

let stage = "настройка";
try {
  if (!key) throw new Error("В контейнере пустой GIGACHAT_AUTH_KEY.");
  if (!bundle) throw new Error("В контейнере пустой GIGACHAT_CA_BUNDLE.");
  stage = "сертификаты";
  const certificates = (await readFile(bundle, "utf8")).match(
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
  );
  if (!certificates?.length)
    throw Object.assign(new Error("Invalid CA bundle"), {
      code: "INVALID_CA_BUNDLE",
    });
  const ca = [...rootCertificates, ...certificates];
  stage = "OAuth";
  const token = await json(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    ca,
    {
      body: new URLSearchParams({ scope }).toString(),
      headers: {
        Authorization: "Basic " + key,
        RqUID: randomUUID(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  if (typeof token?.access_token !== "string" || !token.access_token) {
    throw Object.assign(new Error("Нет токена"), {
      code: "INVALID_TOKEN_RESPONSE",
    });
  }
  console.log("OAuth: OK");
  stage = "список моделей";
  const models = await json("https://api.giga.chat/v1/models", ca, {
    headers: { Authorization: "Bearer " + token.access_token },
  });
  if (!Array.isArray(models?.data)) {
    throw Object.assign(new Error("Нет моделей"), {
      code: "INVALID_MODEL_RESPONSE",
    });
  }
  if (!models.data.some((item) => item?.id === model)) {
    console.log(
      "Доступные модели:",
      models.data
        .map((item) => item?.id)
        .filter((id) => typeof id === "string")
        .join(", "),
    );
    throw Object.assign(new Error("Модель недоступна"), {
      code: "MODEL_NOT_AVAILABLE",
    });
  }
  console.log("Доступ к выбранной модели: OK");
  stage = "ответ модели";
  const completion = await json(
    "https://api.giga.chat/v1/chat/completions",
    ca,
    {
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 160,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Верни только JSON-массив строк с номерами подходящих пунктов.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question: "Сколько баллов нужно для допуска?",
              source:
                "3.1. Для допуска к сессии нужно набрать не меньше 50 баллов и сдать все обязательные работы.",
            }),
          },
        ],
      }),
      headers: {
        Authorization: "Bearer " + token.access_token,
        "Content-Type": "application/json",
      },
    },
  );
  const answer = completion?.choices?.[0]?.message?.content;
  const normalized =
    typeof answer === "string"
      ? answer.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1")
      : "";
  let sections;
  try {
    sections = JSON.parse(normalized);
  } catch {
    throw Object.assign(new Error("Некорректный ответ модели"), {
      code: "INVALID_COMPLETION",
    });
  }
  if (
    !Array.isArray(sections) ||
    sections.length !== 1 ||
    sections[0] !== "3.1"
  ) {
    throw Object.assign(new Error("Ожидался пункт 3.1"), {
      code: "UNEXPECTED_SECTION",
    });
  }
  console.log("Ответ с пунктом 3.1: OK");
} catch (error) {
  console.error(
    stage +
      ": " +
      (stage === "настройка" ? error.message : error.code || "FAILED"),
  );
  process.exitCode = 1;
}
