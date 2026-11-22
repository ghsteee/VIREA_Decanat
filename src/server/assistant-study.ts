import "server-only";
import { dayMonth, mskDate, mskTime } from "@/lib/time";
import { noAnswer, type PersonalAnswer } from "./assistant-personal";
import { studyTopic } from "./assistant-protocol";
import { getStudy, type SubjectStanding } from "./queries/study";
import { getWeekDeadlines } from "./queries/today";

const studyLink = { href: "/study", label: "Открыть учёбу" };
const admission = {
  admitted: "Есть допуск",
  at_risk: "Риск недопуска",
  not_admitted: "Нет допуска",
  unpublished: "Нет ведомости",
} satisfies Record<SubjectStanding["status"], string>;

function words(value: string): string[] {
  return (
    value
      .toLowerCase()
      .replaceAll("ё", "е")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

// Match common Russian case endings while keeping names distinct by whole words.
function stem(word: string) {
  const shortened = word.replace(
    /(?:иями|ями|ами|ому|ему|ими|ыми|ого|его|ых|их|ий|ый|ой|ие|ые|ую|юю|ая|яя|ам|ям|ах|ях|ом|ем|им|ым|ов|ев|ей|а|я|у|ю|ы|и|е|о)$/u,
    "",
  );
  return shortened.length >= 3 ? shortened : word;
}

function mentionsName(question: string[], name: string | null) {
  if (!name) return false;
  const nameWords = words(name);
  if (!nameWords.length) return false;
  return question.some((_, index) =>
    nameWords.every((word, offset) => {
      const candidate = question[index + offset];
      return (
        candidate && (candidate === word || stem(candidate) === stem(word))
      );
    }),
  );
}

function resultList(heading: string, lines: string[]) {
  if (!lines.length) return noAnswer;
  return [
    heading,
    ...lines.slice(0, 8),
    lines.length > 8 ? `Ещё в разделе «Учёба»: ${lines.length - 8}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function dateAndTime(date: Date) {
  return `${dayMonth(mskDate(date))} в ${mskTime(date)}`;
}

function asksForNamedSubject(question: string) {
  return /(?:^| )по (?!(?:всем|кажд|итог|учеб|успева|семестр|предметам|дисциплинам|экзаменам|зачетам|данным|как|срокам|долгам|допус|моим|моей|отдельным|некоторым)\p{L}*)(?=\p{L})/u.test(
    question,
  );
}

function admissionDetails(subject: SubjectStanding) {
  const outstanding = subject.checklist.filter((work) => !work.done);
  const works = outstanding
    .slice(0, 3)
    .map((work) =>
      work.dueAt
        ? `${work.title} (до ${dayMonth(mskDate(work.dueAt))})`
        : work.title,
    );
  return [
    `${subject.name} — ${admission[subject.status]}.`,
    subject.status !== "unpublished" && subject.missingPoints
      ? `До 50 баллов не хватает ${subject.missingPoints}.`
      : "",
    works.length
      ? `Осталось сдать: ${works.join(", ")}${outstanding.length > 3 ? ` и ещё ${outstanding.length - 3}` : ""}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function answerStudy(
  question: string,
  studentProfileId: string,
  groupId: string,
): Promise<PersonalAnswer> {
  const tokens = words(question);
  const normalized = tokens.join(" ");
  const study = await getStudy(studentProfileId, groupId);
  if (!study) return { message: noAnswer };

  const year = tokens.find((token) => /^(?:19|20)\d{2}$/u.test(token));
  const season = normalized.match(/(?:^| )(осен|весн)/u)?.[1];
  const termName = study.term.name.toLowerCase();
  const asksForLastSession =
    /(?:прошл|предыдущ|последн|закрыт)[а-я]* (?:семестр|сесси)/u.test(
      normalized,
    );
  if (
    /средн[а-я]* балл|gpa/u.test(normalized) &&
    asksForLastSession &&
    !year &&
    !season &&
    !asksForNamedSubject(normalized)
  ) {
    return study.lastSession
      ? {
          message: `Средний балл за последнюю закрытую сессию (${study.lastSession.term}): ${study.lastSession.average.toFixed(1).replace(".", ",")}.`,
          link: studyLink,
        }
      : { message: noAnswer };
  }
  const differentTerm =
    /(?:прошл|предыдущ|следующ|будущ|последн)[а-я]* (?:семестр|сесси)|закрытую сессию/u.test(
      normalized,
    ) ||
    (year && !termName.includes(year)) ||
    (season && !termName.includes(season === "весн" ? "вес" : season));
  if (differentTerm) return { message: noAnswer };

  const average = study.average?.toFixed(1).replace(".", ",");
  if (/средн[а-я]* балл|gpa/u.test(normalized)) {
    const asksForCurrentTerm = /(?:текущ[а-я]*|этот|этом) семестр/u.test(
      normalized,
    );
    return average &&
      !asksForNamedSubject(normalized) &&
      !asksForCurrentTerm &&
      !year &&
      !season
      ? {
          message: `Средний балл за закрытые сессии: ${average}.`,
          link: studyLink,
        }
      : { message: noAnswer };
  }

  const namedSubjects = study.subjects.filter(
    (subject) =>
      mentionsName(tokens, subject.name) ||
      mentionsName(tokens, subject.shortName) ||
      (tokens.includes("бд") && subject.name === "Базы данных"),
  );
  const shorthand = normalized.match(/(?:^| )по (\p{L}{3,})$/u)?.[1];
  const partialMatches =
    shorthand && !namedSubjects.length && asksForNamedSubject(normalized)
      ? study.subjects.filter((subject) =>
          words(subject.name).some((word) => stem(word) === stem(shorthand)),
        )
      : [];
  const subjects = partialMatches.length === 1 ? partialMatches : namedSubjects;
  const published = study.subjects.filter(
    (subject) => subject.status !== "unpublished",
  );
  const selected = subjects.length ? subjects : study.subjects;
  const single = subjects.length === 1 ? subjects[0] : undefined;
  if (!subjects.length && asksForNamedSubject(normalized)) {
    return { message: noAnswer };
  }

  const topic = studyTopic(normalized);
  if (topic === "admission" || topic === "debts") {
    if (topic === "admission") {
      return {
        message: resultList("Допуск к сессии", selected.map(admissionDetails)),
        link: studyLink,
      };
    }

    const debts = selected.filter(
      (subject) => subject.status === "not_admitted",
    );
    const atRisk = selected.filter((subject) => subject.status === "at_risk");
    const lines = [
      ...(debts.length
        ? [`Долги: ${debts.length}.`, ...debts.map(admissionDetails)]
        : ["По опубликованным ведомостям долгов нет."]),
      ...atRisk.map(admissionDetails),
    ];
    const message = selected.some((subject) => subject.status !== "unpublished")
      ? lines.slice(0, 9).join("\n")
      : "Ведомости пока не опубликованы.";
    return { message, link: studyLink };
  }

  if (
    /форм[а-я]* контрол|зачет или экзамен|экзамен или зачет/u.test(normalized)
  ) {
    const lines = selected
      .filter((subject) => subject.controlTypes.length)
      .map((subject) => {
        const forms = subject.controlTypes.map((type) =>
          type === "exam" ? "экзамен" : "зачёт",
        );
        return `${subject.name} — ${forms.join(" и ")}.`;
      });
    return { message: resultList("Форма контроля", lines), link: studyLink };
  }

  if (/оценк|оценок|аттестаци|балл[а-я]* за/u.test(normalized)) {
    const assessmentNumber = normalized.match(
      /(?:^| )(?:лаб[а-я]*|работ[а-я]*) (\d+)(?: |$)|(?:^| )(\d+) (?:лаб[а-я]*|работ[а-я]*)(?: |$)/u,
    );
    const number = assessmentNumber?.[1] ?? assessmentNumber?.[2];
    const lines = selected.flatMap((subject) =>
      subject.assessments
        .filter((mark) => !number || words(mark.title).includes(number))
        .filter((mark) => mark.result !== "Результат пока не опубликован")
        .map(
          (mark) =>
            `${single ? "" : `${subject.name} · `}${mark.title} — ${mark.result}`,
        ),
    );
    return {
      message: resultList(
        single ? `Результаты · ${single.name}` : "Результаты текущего семестра",
        lines,
      ),
      link: studyLink,
    };
  }

  if (
    /дедлайн|срок[а-я]* сдачи|когда сдать|когда сдавать/u.test(normalized) &&
    !subjects.length
  ) {
    const deadlines = await getWeekDeadlines(groupId, studentProfileId);
    return {
      message: resultList(
        "Дедлайны на ближайшие семь дней",
        deadlines
          .filter((d) => !d.done)
          .map((d) => `${d.title} — ${dateAndTime(d.dueAt)}`),
      ),
      link: { href: "/", label: "Открыть дедлайны" },
    };
  }

  if (
    /дедлайн|(?:срок|когда) .*сда|сдать|сдавать|несданн|не сдан|задани|лаборатор|лаб[ауые]/u.test(
      normalized,
    )
  ) {
    const dated = /дедлайн|срок|когда/u.test(normalized);
    const outstanding = selected
      .flatMap((subject) =>
        subject.checklist
          .filter((work) => !work.done && (!dated || work.dueAt))
          .map((work) => ({ ...work, subject: subject.name })),
      )
      .sort(
        (a, b) =>
          (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
      );
    const lines = outstanding.map((work) => {
      const title = single ? work.title : `${work.subject} · ${work.title}`;
      return work.dueAt ? `${title} — до ${dateAndTime(work.dueAt)}` : title;
    });
    return {
      message: resultList(
        dated ? "Сроки сдачи работ" : "Что осталось сдать",
        lines,
      ),
      link: studyLink,
    };
  }

  if (/посещаем|пропуск|посетил/u.test(normalized)) {
    const lines = selected
      .filter(({ attendance }) => attendance.recorded > 0)
      .map(
        ({ name, attendance }) =>
          `${name} — посещено ${attendance.present} из ${attendance.recorded} отмеченных занятий.`,
      );
    return { message: resultList("Посещаемость", lines), link: studyLink };
  }

  if (/балл/u.test(normalized) || subjects.length) {
    const lines = selected
      .filter((subject) => subject.status !== "unpublished")
      .map(
        (subject) =>
          `${subject.name} — ${subject.points} из 100 баллов. ${admission[subject.status]}.`,
      );
    return {
      message: resultList("Рейтинг текущего семестра", lines),
      link: studyLink,
    };
  }

  if (!published.length && !average) return { message: noAnswer };
  const summary = [`Текущий семестр: ${study.term.name}.`];
  if (average) summary.push(`Средний балл за закрытые сессии: ${average}.`);
  if (published.length) {
    summary.push(
      `Допуск: ${study.admitted} из ${published.length} дисциплин с опубликованными ведомостями. Долги: ${study.debts}.`,
    );
  }
  return { message: summary.join("\n"), link: studyLink };
}
