import assert from "node:assert/strict";
import test from "node:test";
import {
  answerSections,
  requestDraft,
  sectionAnchor,
} from "../../src/server/assistant-protocol";

test("ответ принимает только номера пунктов из положения", () => {
  const ids = ["3.1", "6.2"];
  assert.deepEqual(answerSections('["3.1","3.1","6.2"]', ids), {
    kind: "match",
    numbers: ids,
  });
  assert.deepEqual(answerSections('["3.2"]', ids), { kind: "invalid" });
  assert.equal(sectionAnchor("3.1"), "p-3-1");
});

test("ошибка формата отличается от отсутствия подходящих пунктов", () => {
  const ids = ["3.1"];
  assert.deepEqual(answerSections("[]", ids), { kind: "no-match" });
  assert.deepEqual(answerSections('{"answer":"любой текст"}', ids), {
    kind: "invalid",
  });
  assert.deepEqual(answerSections('["3.1"', ids), { kind: "invalid" });
});

test("черновик открывается по запросу, справочный вопрос остаётся вопросом", () => {
  assert.equal(
    requestDraft("Нужна справка в военкомат")?.code,
    "military_certificate",
  );
  assert.equal(requestDraft("Как получить справку об обучении?"), null);
  assert.equal(requestDraft("Нужна ли справка об обучении?"), null);
  assert.equal(requestDraft("Мне не нужна справка для военкомата"), null);
  assert.equal(requestDraft("Когда начинается летняя практика?"), null);
});
