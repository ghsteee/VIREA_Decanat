export function answerSections(
  reply: string,
  allowed: Iterable<string>,
): string[] | null {
  const valid = new Set(allowed);
  const normalized = reply
    .trim()
    .replace(/^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i, "$1");
  try {
    const answer: unknown = JSON.parse(normalized);
    if (!Array.isArray(answer) || answer.length > 3) return null;
    if (
      answer.some(
        (section) => typeof section !== "string" || !valid.has(section),
      )
    )
      return null;
    return [...new Set(answer as string[])];
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
