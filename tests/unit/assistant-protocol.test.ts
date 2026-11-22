import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAssistantAnswer,
  requestDraft,
  sectionAnchor,
} from "../../src/server/assistant-protocol";

test("ответы о кабинете ссылаются на известные пункты или страницы", () => {
  const answer = "Для допуска открой чек-лист дисциплины.";
  const campus = {
    kind: "campus",
    answer,
    sections: ["3.1"],
    pages: ["study"],
  };
  const parse = (value: unknown) =>
    parseAssistantAnswer(JSON.stringify(value), ["3.1"], ["study"]);
  assert.deepEqual(parse(campus), campus);
  assert.deepEqual(parse({ ...campus, sections: [], pages: ["study"] }), {
    ...campus,
    sections: [],
  });
  assert.equal(parse({ ...campus, sections: ["9.9"] }), null);
  assert.equal(parse({ ...campus, pages: ["https://example.org"] }), null);
  assert.equal(parse({ ...campus, sections: [], pages: [] }), null);
  assert.equal(parse({ ...campus, answer: "" }), null);
  assert.equal(sectionAnchor("3.1"), "p-3-1");
});

test("учебное объяснение имеет отдельный тип и выводится без ссылок на вуз", () => {
  const study = {
    kind: "study",
    answer: "Индекс ускоряет поиск по таблице.",
    sections: [],
    pages: [],
  };
  assert.deepEqual(parseAssistantAnswer(JSON.stringify(study), []), study);
  assert.equal(
    parseAssistantAnswer(JSON.stringify({ ...study, sections: ["3.1"] }), [
      "3.1",
    ]),
    null,
  );
});

test("черновик открывается по запросу, справочный вопрос остаётся вопросом", () => {
  assert.equal(
    requestDraft("Нужна справка в военкомат")?.code,
    "military_certificate",
  );
  assert.equal(requestDraft("Как получить справку об обучении?"), null);
  assert.equal(requestDraft("Когда начинается летняя практика?"), null);
});
