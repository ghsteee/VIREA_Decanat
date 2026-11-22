"use server";

import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { assistantRules } from "@/server/assistant-docs";
import { answerSections, requestDraft } from "@/server/assistant-protocol";
import {
  assistantConfigured,
  assistantEnabled,
  chooseSections,
} from "@/server/gigachat";
import { hitRateLimit } from "@/server/rate-limit";

export type AssistantState = {
  question?: string;
  message?: string;
  sections?: { number: string; heading: string | null; text: string }[];
  draft?: { code: string; label: string };
};

const noAnswer = "В демо-положении ответа нет. Уточни в дирекции.";
const unavailable =
  "Помощник сейчас недоступен. Правила можно прочитать в демо-положении.";

export async function askAssistant(
  _previous: AssistantState,
  form: FormData,
): Promise<AssistantState> {
  const user = await requireUser();
  if (!assistantEnabled() || user.role !== "student" || !user.studentProfileId)
    notFound();
  const value = form.get("question");
  const question = typeof value === "string" ? value.trim() : "";
  if (!question || question.length > 400)
    return { message: "Напиши вопрос длиной до 400 символов." };

  const limit = await hitRateLimit(`assistant:${user.id}`, 20, 3600);
  if (!limit.allowed)
    return { message: "Лимит вопросов на этот час исчерпан. Попробуй позже." };

  const draft = requestDraft(question);
  if (draft)
    return {
      question,
      draft,
      message:
        "Черновик готов. Проверь поля, затем самостоятельно отправь заявку.",
    };
  if (/(чужи[ех]|другого студент|одногруппник)/iu.test(question))
    return { question, message: noAnswer };
  if (!assistantConfigured()) return { question, message: unavailable };

  const rules = await assistantRules();
  if (!rules?.sections.length) return { question, message: unavailable };
  const source = rules.sections
    .map(({ number, heading, text }) => `${number}. ${heading ?? ""}\n${text}`)
    .join("\n")
    .slice(0, 22_000);
  const result = await chooseSections(question, source);
  if (result.kind === "busy")
    return {
      question,
      message:
        "Деканыч отвечает на другой вопрос. Попробуй ещё раз через несколько секунд.",
    };
  if (result.kind !== "ok") return { question, message: unavailable };

  // Only genuine document excerpts reach the UI. The model never returns page links or free text.
  const answer = answerSections(
    result.reply,
    rules.sections.map((section) => section.number),
  );
  if (answer.kind === "invalid") return { question, message: unavailable };
  if (answer.kind === "no-match") return { question, message: noAnswer };
  return {
    question,
    sections: answer.numbers.flatMap((number) =>
      rules.sections.filter((section) => section.number === number),
    ),
  };
}
