import assert from "node:assert/strict";
import test from "node:test";
import { meetingLink } from "../../src/lib/meeting-link";

test("демонстрационные и некорректные адреса встречи не становятся кнопками", () => {
  for (const value of [
    null,
    "not a link",
    "https://example.org/demo-meet/english",
    "https://room.example.com/session",
    "https://virea.example/room",
    "https://virea.invalid/room",
    "https://virea.test/room",
    "https://localhost/room",
    "http://telemost.yandex.ru/j/123",
    "javascript:alert(1)",
    "https://name:secret@telemost.yandex.ru/j/123",
  ])
    assert.equal(meetingLink(value), null);
});

test("обычная HTTPS-ссылка встречи сохраняется вместе с параметрами", () => {
  const value = "https://telemost.yandex.ru/j/123?key=demo#room";
  assert.equal(meetingLink(value), value);
});
