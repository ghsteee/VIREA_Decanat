"use server";

import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { assistantRules } from "@/server/assistant-docs";
import {
  parseAssistantAnswer,
  requestDraft,
} from "@/server/assistant-protocol";
import {
  assistantConfigured,
  assistantEnabled,
  generateAssistantAnswer,
} from "@/server/gigachat";
import { assistantPages } from "@/server/assistant-site";
import { hitRateLimit } from "@/server/rate-limit";

export type AssistantState = {
  question?: string;
  message?: string;
  answer?: string;
  sections?: readonly string[];
  kind?: "campus" | "study";
  pages?: { href: string; title: string }[];
  draft?: { code: string; label: string };
};

const noAnswer =
  "Не нашёл подтверждённого ответа. Если вопрос о кабинете или правилах вуза, уточни в дирекции.";
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
    .join("\n\n");
  const site = assistantPages
    .map(({ id, title, description }) => `${id} — ${title}. ${description}`)
    .join("\n");
  const result = await generateAssistantAnswer(question, source, site);
  if (result.kind === "busy")
    return {
      question,
      message:
        "Деканыч отвечает на другой вопрос. Попробуй ещё раз через несколько секунд.",
    };
  if (result.kind !== "ok") return { question, message: unavailable };

  const answer = parseAssistantAnswer(
    result.reply,
    rules.sections.map((section) => section.number),
    assistantPages.map((page) => page.id),
  );
  if (!answer) return { question, message: noAnswer };
  return {
    question,
    ...answer,
    pages: assistantPages
      .filter(({ id }) => answer.pages.includes(id))
      .map(({ href, title }) => ({ href, title })),
  };
}
