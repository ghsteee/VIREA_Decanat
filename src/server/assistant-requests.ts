import "server-only";
import { num, STATUS_LABEL } from "@/server/applications";
import { db } from "@/server/db";
import { pickupLabel } from "@/server/pickup";
import { noAnswer, type PersonalAnswer } from "./assistant-personal";

const requestTypes = [
  { code: "study_certificate", text: /об обучени|по месту требован/u },
  { code: "military_certificate", text: /военкомат/u },
  { code: "raised_stipend", text: /повышенн\p{L}* стипенд/u },
  { code: "stipend_certificate", text: /справк\p{L}* о стипенд/u },
  { code: "retake", text: /пересдач/u },
  { code: "material_aid", text: /мат(?:ериальн\p{L}*)?\.?\s*помощ/u },
  { code: "academic_transcript", text: /выписк/u },
  { code: "student_card_duplicate", text: /дубликат|студенческ\p{L}* билет/u },
  { code: "study_consultation", text: /консультаци/u },
  {
    code: "profile_correction",
    text: /(?:уточнени|изменени|исправлени)\p{L}* данных/u,
  },
];

const maxListed = 5;

export async function answerRequests(
  question: string,
  studentProfileId: string,
): Promise<PersonalAnswer> {
  const text = question.toLocaleLowerCase("ru").replaceAll("ё", "е");
  const numberText = text.match(
    /(?:№|номер\s*|заявк\p{L}*\s+#?|справк\p{L}*\s+#?)\s*(\d+)(?!\d)/u,
  )?.[1];
  const number = numberText ? Number(numberText) : undefined;
  if (number !== undefined && (number < 1 || number > 2_147_483_647)) {
    return { message: noAnswer };
  }

  const codes = requestTypes
    .filter(({ text: pattern }) => pattern.test(text))
    .map(({ code }) => code);
  const certificates = /справк/u.test(text);
  if (
    number === undefined &&
    codes.length === 0 &&
    /справк\p{L}*\s+(?:о|об|для|на)\s+\p{L}/u.test(text)
  ) {
    return { message: noAnswer };
  }

  const readyOnly =
    number === undefined &&
    (/готов(?:ые|ых)\s+(?:справк|заявк)|(?:какие|покажи|есть)\s+[^?.!]*готов(?:ы|а)(?!\p{L})/u.test(
      text,
    ) ||
      /(?:что|какие[^?.!]*?)\s+(?:уже\s+)?можно\s+забрать/u.test(text));
  const latestOnly = number !== undefined || (codes.length === 1 && !readyOnly);
  const applications = await db.application.findMany({
    where: {
      studentId: studentProfileId,
      number,
      status: readyOnly ? "ready" : undefined,
      type: codes.length
        ? { code: { in: codes } }
        : certificates && number === undefined
          ? { title: { startsWith: "Справка", mode: "insensitive" } }
          : undefined,
    },
    select: {
      id: true,
      number: true,
      status: true,
      type: { select: { title: true } },
      deliveryMethod: true,
      reservation: {
        select: {
          slot: { select: { startsAt: true, endsAt: true, place: true } },
        },
      },
      events: {
        where: { toStatus: "ready" },
        orderBy: { version: "desc" },
        take: 1,
        select: { pickupNote: true },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { number: "desc" }],
    take: latestOnly ? 1 : maxListed + 1,
  });

  if (applications.length === 0) {
    return {
      message:
        readyOnly && codes.length === 0
          ? certificates
            ? "Готовых справок пока нет."
            : "Готовых заявок пока нет."
          : noAnswer,
    };
  }

  const statuses = applications.slice(0, maxListed).map((application) => {
    const title = `${application.type.title} №${num(application.number)}`;
    const status = `${title} — ${STATUS_LABEL[application.status]}.`;
    if (application.status !== "ready") return status;
    const pickup = application.events[0]?.pickupNote;
    if (pickup) return `${status} ${pickup}`;
    if (application.reservation) {
      return `${status} Получение: ${pickupLabel(application.reservation.slot)}.`;
    }
    if (application.deliveryMethod === "electronic") {
      return `${status} Способ получения — электронно.`;
    }
    return status;
  });
  if (applications.length > maxListed) {
    statuses.push("Остальные заявки можно посмотреть в кабинете.");
  }
  return {
    message: statuses.join("\n"),
    link:
      applications.length === 1
        ? { href: `/requests/${applications[0].id}`, label: "Открыть заявку" }
        : { href: "/requests?view=all", label: "Открыть заявки" },
  };
}
