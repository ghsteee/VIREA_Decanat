import "server-only";
import { dayMonth, mskDate, mskTime } from "@/lib/time";
import { noAnswer, type PersonalAnswer } from "./assistant-personal";
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
  return /(?:^| )по (?!всем|кажд|итог|учеб|семестр|предметам|дисциплинам|экзаменам|зачетам|данным)/u.test(
    question,
  );
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

  const subjects = study.subjects.filter(
    (subject) =>
      mentionsName(tokens, subject.name) ||
      mentionsName(tokens, subject.shortName) ||
      (tokens.includes("бд") && subject.name === "Базы данных"),
  );
  const published = study.subjects.filter(
    (subject) => subject.status !== "unpublished",
  );
  const selected = subjects.length ? subjects : study.subjects;
  const single = subjects.length === 1 ? subjects[0] : undefined;
  if (!subjects.length && asksForNamedSubject(normalized)) {
    return { message: noAnswer };
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

  if (/долг|задолженн/u.test(normalized)) {
    if (!selected.some((subject) => subject.status !== "unpublished"))
      return { message: noAnswer };
    const debts = selected.filter(
      (subject) => subject.status === "not_admitted",
    );
    return {
      message: debts.length
        ? resultList(
            `Долги: ${debts.length}.`,
            debts.map((subject) => subject.name),
          )
        : "По опубликованным ведомостям долгов нет.",
      link: studyLink,
    };
  }

  if (/допуск|допущ|допуст|не хватает|хватает ли/u.test(normalized)) {
    const lines = selected
      .filter((subject) => subject.status !== "unpublished")
      .map((subject) => {
        const missing = subject.missingPoints
          ? `. До 50 баллов не хватает ${subject.missingPoints}`
          : "";
        return `${subject.name} — ${admission[subject.status]}${missing}.`;
      });
    return { message: resultList("Допуск к сессии", lines), link: studyLink };
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
