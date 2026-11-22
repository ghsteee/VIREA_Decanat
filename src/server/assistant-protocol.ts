type AssistantAnswer = {
  kind: "campus" | "study";
  answer: string;
  sections: string[];
  pages: string[];
};

export function parseAssistantAnswer(
  reply: string,
  allowed: Iterable<string>,
  pageIds: Iterable<string> = [],
): AssistantAnswer | null {
  const normalized = reply
    .trim()
    .replace(/^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i, "$1");
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object") return null;
    const { answer, kind, sections, pages } = parsed as Record<string, unknown>;
    if (typeof answer !== "string" || !answer.trim() || answer.length > 1200)
      return null;
    if (kind === "study") {
      if (
        !Array.isArray(sections) ||
        sections.length ||
        !Array.isArray(pages) ||
        pages.length
      )
        return null;
      return { answer: answer.trim(), kind, sections: [], pages: [] };
    }
    if (kind !== "campus") return null;
    const validSections = new Set(allowed);
    const validPages = new Set(pageIds);
    if (
      !Array.isArray(sections) ||
      !Array.isArray(pages) ||
      sections.length + pages.length === 0 ||
      sections.length + pages.length > 4 ||
      sections.some(
        (section) => typeof section !== "string" || !validSections.has(section),
      ) ||
      pages.some((page) => typeof page !== "string" || !validPages.has(page))
    )
      return null;
    return {
      answer: answer.trim(),
      kind,
      sections: [...new Set(sections as string[])],
      pages: [...new Set(pages as string[])],
    };
  } catch {
    return null;
  }
}

export function requestDraft(question: string) {
  if (!/(нужн[аоу]|закажи|оформи|подготовь|черновик)/iu.test(question))
    return null;
  if (/справк/iu.test(question) && /военкомат/iu.test(question))
    return { code: "military_certificate", label: "Справка для военкомата" };
  if (/справк/iu.test(question) && /обучени|по месту требован/iu.test(question))
    return { code: "study_certificate", label: "Справка об обучении" };
  return null;
}

export function sectionAnchor(number: string) {
  return `p-${number.replaceAll(".", "-")}`;
}
