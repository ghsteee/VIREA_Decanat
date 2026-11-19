import assert from "node:assert/strict";
import test from "node:test";
import {
  answerSections,
  requestDraft,
  sectionAnchor,
} from "../../src/server/assistant-protocol";

test("ответ принимает только номера пунктов из положения", () => {
  const ids = ["3.1", "6.2"];
  assert.deepEqual(answerSections('["3.1","3.1","6.2"]', ids), ids);
  assert.deepEqual(answerSections("[]", ids), []);
  assert.equal(answerSections('["3.2"]', ids), null);
  assert.equal(answerSections('{"answer":"любой текст"}', ids), null);
  assert.equal(sectionAnchor("3.1"), "p-3-1");
});

test("черновик открывается по запросу, справочный вопрос остаётся вопросом", () => {
  assert.equal(
    requestDraft("Нужна справка в военкомат")?.code,
    "military_certificate",
  );
  assert.equal(requestDraft("Как получить справку об обучении?"), null);
  assert.equal(requestDraft("Когда начинается летняя практика?"), null);
});
