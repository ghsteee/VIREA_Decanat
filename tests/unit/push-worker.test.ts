import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const origin = "https://dekanych.test";
const script = readFileSync("public/sw.js", "utf8");

type WorkerEvent = {
  data?: { json: () => unknown };
  notification?: { close: () => void; data: { url: string } };
  waitUntil: (promise: Promise<unknown>) => void;
};

function loadWorker(clients: object, registration?: object) {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  runInNewContext(script, {
    URL,
    self: {
      location: { origin },
      clients,
      registration,
      addEventListener: (type: string, handler: (event: WorkerEvent) => void) =>
        handlers.set(type, handler),
    },
  });
  return async (type: string, event: Omit<WorkerEvent, "waitUntil">) => {
    let work: Promise<unknown> | undefined;
    handlers.get(type)?.({
      ...event,
      waitUntil: (promise) => {
        work = promise;
      },
    });
    assert.ok(work);
    await work;
  };
}

test("push сохраняет ссылку только на раздел кабинета", async () => {
  const shown: string[] = [];
  const fire = loadWorker(
    {},
    {
      async showNotification(
        _title: string,
        options: { data: { url: string } },
      ) {
        shown.push(options.data.url);
      },
    },
  );
  await fire("push", {
    data: { json: () => ({ url: "/schedule?date=2026-11-21" }) },
  });
  await fire("push", {
    data: { json: () => ({ url: "https://outside.example.test/" }) },
  });
  await fire("push", {});
  assert.deepEqual(shown, [
    origin + "/schedule?date=2026-11-21",
    origin + "/feed",
    origin + "/feed",
  ]);
});

test("по клику воркер ждёт переход и фокусирует открытую вкладку", async () => {
  const actions: string[] = [];
  const fire = loadWorker({
    async matchAll() {
      return [
        {
          url: origin + "/profile",
          async navigate(url: string) {
            actions.push("navigate " + url);
            return {
              async focus() {
                actions.push("focus");
              },
            };
          },
        },
      ];
    },
  });
  await fire("notificationclick", {
    notification: {
      close: () => actions.push("close"),
      data: { url: "/schedule" },
    },
  });
  assert.deepEqual(actions, [
    "close",
    "navigate " + origin + "/schedule",
    "focus",
  ]);
});

test("если вкладка закрылась, по клику открывается лента", async () => {
  const opened: string[] = [];
  const fire = loadWorker({
    async matchAll() {
      return [
        {
          url: origin + "/profile",
          async navigate() {
            return null;
          },
        },
      ];
    },
    async openWindow(url: string) {
      opened.push(url);
    },
  });
  await fire("notificationclick", {
    notification: {
      close() {},
      data: { url: "https://outside.example.test/" },
    },
  });
  assert.deepEqual(opened, [origin + "/feed"]);
});
