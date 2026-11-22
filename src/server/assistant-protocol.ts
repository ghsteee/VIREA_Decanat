export function answerSections(
  reply: string,
  allowed: Iterable<string>,
):
  | { kind: "invalid" }
  | { kind: "no-match" }
  | { kind: "match"; numbers: string[] } {
  const valid = new Set(allowed);
  const normalized = reply
    .trim()
    .replace(/^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i, "$1");
  try {
    const answer: unknown = JSON.parse(normalized);
    if (!Array.isArray(answer) || answer.length > 3) return { kind: "invalid" };
    if (
      !answer.every(
        (section): section is string =>
          typeof section === "string" && valid.has(section),
      )
    )
      return { kind: "invalid" };
    if (answer.length === 0) return { kind: "no-match" };
    return { kind: "match", numbers: [...new Set(answer)] };
  } catch {
    return { kind: "invalid" };
  }
}

export function requestDraft(question: string) {
  if (
    !/(нужн[аоу]|закажи|оформи|подготовь|черновик)/iu.test(question) ||
    /(?:^|[^\p{L}])(?:не\s+(?:нужн[аоу]|закажи|оформи|подготовь)|нужн[аоу]\s+ли)(?!\p{L})/iu.test(
      question,
    )
  )
    return null;
  if (/справк/iu.test(question) && /военкомат/iu.test(question))
    return { code: "military_certificate", label: "Справка для военкомата" };
  if (/справк/iu.test(question) && /обучени|по месту требован/iu.test(question))
    return { code: "study_certificate", label: "Справка об обучении" };
  return null;
}

export function studyTopic(text: string) {
  if (
    /(?:^|[^а-я])долг(?:и|ов|ам|ами|ах|а|ом|у)?(?![а-я])|задолж|(?:^|[^а-я])хвост(?:ы|ов|ам|ами|ах)?(?![а-я])|(?:что|какие работы).*?(?:закрыть|досдать|не сдан)/u.test(
      text,
    )
  )
    return "debts";
  if (
    /допус|допущ|не хватает|хватает ли|(?:могу|можно|смогу) ли.*?сдавать.*?(?:экзамен|зачет|сесси)|(?:пустят|пускают|попаду).*?(?:экзамен|зачет|сесси)/u.test(
      text,
    )
  )
    return "admission";
  if (/что (?:мне )?(?:нужно|надо|осталось) сдать/u.test(text)) return "debts";
  return null;
}

export function studyRuleNumbers(question: string): string[] {
  const text = question.toLowerCase().replaceAll("ё", "е");
  if (
    /(?:^|[^а-я])(?:у меня|меня|мне|мо[ийяюе]|мои[мх]?)(?![а-я])|(?:^| )по (?!каким|всем|кажд|итог|учеб)/u.test(
      text,
    )
  )
    return [];

  const topic = studyTopic(text);
  if (
    topic === "admission" &&
    /услови|требован|сколько.*?(?:нужно|надо|требуется)|что.*?(?:нужно|надо|требуется)|как (?:получить|оформить).*?допуск/u.test(
      text,
    )
  )
    return ["3.1", "3.2"];
  if (
    /(?:как|где|сколько раз).*?пересда|(?:как|где).*?закрыть.*?(?:долг|задолжен)/u.test(
      text,
    )
  )
    return ["5.1", "5.2", "5.3"];
  return [];
}

export function questionTopic(question: string) {
  const text = question.toLowerCase().replaceAll("ё", "е");
  if (
    /чуж(?:ая|ие|их|ую|ой|ого)|одногруппник|(?:другого|другой)\s+(?:студент|групп)|(?:моего|моей)\s+(?:друга|подруг|сосед)/u.test(
      text,
    )
  )
    return "private";

  const own = /(?:^|[^а-я])(?:мо[ийяюе]|мои[мх]?|у меня|мне)(?![а-я])/u.test(
    text,
  );
  const certificate = /справк|заявк|заявлени|выписк/u.test(text);
  if (
    certificate &&
    (/№\s*\d|номер\s+\d|(?:заявк[ауе]|справк[ауе])\s+#?\d/u.test(text) ||
      /готов(?:а|ы|о|ность|ые)|статус|что с|отслед|когда (?:выдадут|подготовят|забрать)|(?:можно|могу [^?!.]*?) забрать|принят[аыо]|в работе/u.test(
        text,
      ) ||
      (own &&
        !/надо|нужн[аоу]|как (?:оформ|подать|заказ)|сколько (?:готов|дела)/u.test(
          text,
        )))
  )
    return "requests";

  if (studyRuleNumbers(question).length) return "rules";
  if (studyTopic(text)) return "study";

  if (
    /посещаем|пропустил|посетил|форм[а-я]* контрол|зачет или экзамен|экзамен или зачет|(?:^|\W)gpa(?:\W|$)/u.test(
      text,
    ) ||
    (own && /оцен(?:ка|ки|ок|ку|кам)|балл[а-я]* за/u.test(text))
  )
    return "study";

  if (
    /расписани|(?:^|[^а-я])пар(?:а|у|ы|е|ой|ам|ами)?(?![а-я])|заняти/u.test(
      text,
    ) ||
    (/сесси|экзамен|зачет/u.test(text) &&
      /(?:когда|во сколько|где|дата|время|ближайш|какие у меня)/u.test(text) &&
      !/пересда|можно|надо|нужно/u.test(text))
  )
    return "schedule";

  if (
    /успева[еи]м|оцен(?:ка|ки|ок|ку|кам)|балл|допу[сщ]|долг|задолж|дедлайн|срок сдачи|средний|работ|сдан|когда сдат|когда сдава|лаборатор/u.test(
      text,
    ) &&
    (own ||
      !/сколько (?:баллов )?(?:нужно|надо|требуется)|как (?:счита|пересда|выстав|начисл|получ)|что такое|какие условия/u.test(
        text,
      ))
  )
    return "study";

  return "rules";
}

export function sectionAnchor(number: string) {
  return `p-${number.replaceAll(".", "-")}`;
}
