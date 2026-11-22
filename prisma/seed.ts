/**
 * Демо-данные «Деканыча» (задача 3.5). Полностью пересоздаёт данные:
 *   npm run db:seed
 *
 * Все люди, номера и адреса вымышленные (NF6). События «сегодня» строятся
 * от текущей даты в Москве, поэтому сброс каждое утро даёт живое демо.
 *
 * Пароли тестовых аккаунтов в репозиторий не попадают (правило 10 AGENTS.md):
 * берутся из SEED_PASSWORD, а если её нет — генерируются и печатаются в консоль.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "@node-rs/argon2";
import {
  PrismaClient,
  type AssessmentKind,
  type LessonKind,
  type Prisma,
} from "@prisma/client";

const db = new PrismaClient();

// ─── Время в Москве ──────────────────────────────────────────────────────

const TZ = "Europe/Moscow";

/** Дата YYYY-MM-DD «сегодня» по Москве. */
function todayMsk(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Момент времени по московской дате и времени. */
function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:00`);
}

/** День недели 1 = понедельник … 7 = воскресенье. */
function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00+03:00`).getUTCDay();
  return d === 0 ? 7 : d;
}

const PAIRS: Record<number, [string, string]> = {
  1: ["09:00", "10:30"],
  2: ["10:40", "12:10"],
  3: ["12:40", "14:10"],
  4: ["14:20", "15:50"],
  5: ["16:20", "17:50"],
  6: ["18:00", "19:30"],
};

// ─── Семестр ─────────────────────────────────────────────────────────────

const TERM = {
  name: "Осенний семестр 2026/27",
  startsOn: "2026-09-01",
  endsOn: "2026-12-31",
  sessionStartsOn: "2026-12-22",
  firstMonday: "2026-08-31",
  lastTeachingDay: "2026-12-20",
};

// ─── Справочники ─────────────────────────────────────────────────────────

const TEACHERS = [
  "Ясноборов Игнат Аркадьевич",
  "Мшистопёров Платон Олегович",
  "Лунноберегов Глеб Ростиславович",
  "Тихосклонов Аристарх Денисович",
  "Ветрянотропин Данияр Львович",
  "Звёзднодолов Лука Петрович",
  "Плёсокручев Фрол Романович",
  "Медовикова Злата Сергеевна",
  "Листосклонова Марфа Глебовна",
  "Клеверосветов Савелий Игоревич",
  "Янтарнорощина Ульяна Арсеньевна",
  "Росопадова Вера Ильинична",
] as const;

const SUBJECTS = {
  history: { name: "История России", short: "История" },
  calculus: { name: "Математический анализ", short: "Матанализ" },
  programming: { name: "Программирование", short: "Программир." },
  databases: { name: "Базы данных", short: "Базы данных" },
  pe: { name: "Физическая культура", short: "Физкультура" },
  english: { name: "Английский язык", short: "Английский" },
  linalg: { name: "Линейная алгебра", short: "Линал" },
  physics: { name: "Физика", short: "Физика" },
  ml: { name: "Машинное обучение", short: "Машинное обуч." },
  stats: { name: "Теория вероятностей", short: "Теорвер" },
  orgchem: { name: "Органическая химия", short: "Органика" },
  physchem: { name: "Физическая химия", short: "Физхимия" },
  networks: { name: "Компьютерные сети", short: "Комп. сети" },
  os: { name: "Операционные системы", short: "ОС" },
  infosec: { name: "Основы информационной безопасности", short: "Основы ИБ" },
  optimization: { name: "Методы оптимизации", short: "Оптимизация" },
  numerical: { name: "Численные методы", short: "Числ. методы" },
  visualization: { name: "Визуализация данных", short: "Визуализация" },
  processes: {
    name: "Процессы и аппараты химической технологии",
    short: "ПАХТ",
  },
  analytical: { name: "Аналитическая химия", short: "Аналит. химия" },
  materials: { name: "Материаловедение", short: "Материаловедение" },
  ecology: { name: "Промышленная экология", short: "Пром. экология" },
} as const;
type SubjectKey = keyof typeof SUBJECTS;

/** Вымышленные фамилии и имена для одногруппников без входа в кабинет. */
const EXTRA_LAST = [
  "Ольхова",
  "Кедрин",
  "Пасечникова",
  "Мельников",
  "Заречнова",
  "Камышин",
  "Луговая",
  "Тумановский",
  "Ручейкова",
  "Солнцедаров",
  "Ветрогонов",
  "Брусничкина",
  "Сосновцев",
  "Полынова",
  "Ковылин",
  "Облепихова",
  "Морошкин",
  "Зарницына",
  "Снегирёв",
  "Рябинина",
  "Овражкин",
  "Ясенева",
  "Черёмухин",
  "Подорожникова",
  "Клюквин",
  "Ромашкина",
];
const EXTRA_FIRST = [
  "Мирослава",
  "Тимофей",
  "Ева",
  "Арсений",
  "Злата",
  "Глеб",
  "Варвара",
  "Елисей",
  "Милана",
  "Савва",
  "Лев",
  "Таисия",
  "Демид",
  "Агата",
  "Ярослав",
  "Ульяна",
  "Платон",
  "Василиса",
  "Фёдор",
  "Стефания",
  "Мирон",
  "Есения",
  "Тихон",
  "Алиса",
  "Роман",
  "Полина",
];

// ─── Помощники ───────────────────────────────────────────────────────────

const ARGON = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function wipe() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (list)
    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
    );
}

/** Разбор демо-положения на пункты для помощника (AI1). */
function parseRegulations(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const sections: { number: string; heading: string; text: string }[] = [];
  let heading = "";
  let current: { number: string; heading: string; lines: string[] } | null =
    null;
  const flush = () => {
    if (current) {
      sections.push({
        number: current.number,
        heading: current.heading,
        text: current.lines.join("\n").trim(),
      });
    }
    current = null;
  };
  for (const line of lines) {
    const h = line.match(/^## (\d+)\. (.+)$/);
    if (h) {
      flush();
      heading = h[2];
      continue;
    }
    const p = line.match(/^(\d+\.\d+)\. (.*)$/);
    if (p) {
      flush();
      current = { number: p[1], heading, lines: [p[2]] };
      continue;
    }
    if (current && !line.startsWith("#") && !line.startsWith(">")) {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}

// ─── Основной сценарий ───────────────────────────────────────────────────

async function main() {
  const regulationsPath = join(
    process.cwd(),
    "docs/knowledge/polozhenie-demo.md",
  );
  const sections = parseRegulations(readFileSync(regulationsPath, "utf8"));
  if (!sections.length)
    throw new Error("В демо-положении не найдено ни одного пункта");

  const today = todayMsk();
  const tomorrow = addDays(today, 1);
  if (today < TERM.startsOn || today > TERM.lastTeachingDay) {
    console.warn(
      `Сегодня ${today} вне учебного периода семестра — расписание будет пустым вокруг этой даты.`,
    );
  }

  const password =
    process.env.SEED_PASSWORD || randomBytes(9).toString("base64url");
  const passwordHash = await hash(password, ARGON);
  // Одногруппники без входа: хэш случайной строки, войти под ними нельзя
  const lockedHash = await hash(randomBytes(32).toString("hex"), ARGON);

  await wipe();

  // Институты, группы, корпуса
  const inst = {
    ikb: await db.institute.create({
      data: { code: "ИКБ", name: "Институт кибербезопасности (демо)" },
    }),
    iii: await db.institute.create({
      data: { code: "ИИИ", name: "Институт искусственного интеллекта (демо)" },
    }),
    ith: await db.institute.create({
      data: { code: "ИТХ", name: "Институт тонкой химии (демо)" },
    }),
  };
  const group = {
    biso: await db.group.create({
      data: { code: "БИСО-03-25", course: 1, instituteId: inst.ikb.id },
    }),
    kmbo: await db.group.create({
      data: { code: "КМБО-07-24", course: 2, instituteId: inst.iii.id },
    }),
    khebo: await db.group.create({
      data: { code: "ХЕБО-02-23", course: 3, instituteId: inst.ith.id },
    }),
  };

  const campuses = {
    A: await db.campus.create({
      data: {
        code: "А",
        name: "Корпус А",
        address: "ул. Табельная, 7 (вымышленный адрес)",
      },
    }),
    B: await db.campus.create({
      data: {
        code: "Б",
        name: "Корпус Б",
        address: "ул. Табельная, 7, стр. 2 (вымышленный адрес)",
      },
    }),
    V: await db.campus.create({
      data: {
        code: "В",
        name: "Корпус В",
        address: "Перронный пер., 3 (вымышленный адрес)",
      },
    }),
    G: await db.campus.create({
      data: {
        code: "Г",
        name: "Корпус Г",
        address: "Перронный пер., 5 (вымышленный адрес)",
      },
    }),
  };
  const roomCache = new Map<string, string>();
  async function room(code: string): Promise<string> {
    // «А-214» → корпус А, аудитория 214, этаж по первой цифре
    const cached = roomCache.get(code);
    if (cached) return cached;
    const [c, number] = code.split("-") as [string, string];
    const byLetter: Record<string, (typeof campuses)[keyof typeof campuses]> = {
      А: campuses.A,
      Б: campuses.B,
      В: campuses.V,
      Г: campuses.G,
      Зал: campuses.A,
    };
    const campus = byLetter[c];
    if (!campus) throw new Error(`Неизвестный корпус в «${code}»`);
    const r = await db.room.create({
      data: {
        campusId: campus.id,
        number: c === "Зал" ? "Спортзал" : number,
        floor: /^\d/.test(number ?? "") ? Number(number[0]) : 1,
      },
    });
    roomCache.set(code, r.id);
    return r.id;
  }

  const teachers = await Promise.all(
    TEACHERS.map((fullName) => db.teacher.create({ data: { fullName } })),
  );
  const T = (surname: string) =>
    teachers.find((t) => t.fullName.startsWith(surname))!.id;

  const subjects = {} as Record<SubjectKey, string>;
  for (const [key, s] of Object.entries(SUBJECTS)) {
    subjects[key as SubjectKey] = (
      await db.subject.create({ data: { name: s.name, shortName: s.short } })
    ).id;
  }

  const term = await db.academicTerm.create({
    data: {
      name: TERM.name,
      startsOn: new Date(TERM.startsOn),
      endsOn: new Date(TERM.endsOn),
      sessionStartsOn: new Date(TERM.sessionStartsOn),
    },
  });
  for (let w = 1; w <= 17; w++) {
    await db.academicWeek.create({
      data: {
        termId: term.id,
        number: w,
        startsOn: new Date(addDays(TERM.firstMonday, (w - 1) * 7)),
      },
    });
  }

  // ─── Пользователи ──────────────────────────────────────────────────────
  type Person = {
    login: string;
    last: string;
    first: string;
    middle?: string;
    groupId: string;
    programme: string;
    card: string;
    funding?: "budget" | "paid";
  };
  async function student(p: Person, locked = false) {
    const user = await db.user.create({
      data: {
        login: p.login,
        passwordHash: locked ? lockedHash : passwordHash,
        role: "student",
        preferences: { create: {} },
        studentProfile: {
          create: {
            groupId: p.groupId,
            lastName: p.last,
            firstName: p.first,
            middleName: p.middle,
            programme: p.programme,
            funding: p.funding ?? "budget",
            studentCardNo: p.card,
          },
        },
      },
      include: { studentProfile: true },
    });
    return { userId: user.id, profileId: user.studentProfile!.id };
  }

  const danila = await student({
    login: "d.severov",
    last: "Северов",
    first: "Данила",
    middle: "Ильич",
    groupId: group.biso.id,
    programme: "Информационная безопасность",
    card: "25В0417",
  });
  const ksenia = await student({
    login: "k.lavrova",
    last: "Лаврова",
    first: "Ксения",
    middle: "Андреевна",
    groupId: group.kmbo.id,
    programme: "Прикладная математика",
    card: "24И1132",
  });
  const marat = await student({
    login: "m.gainullin",
    last: "Гайнуллин",
    first: "Марат",
    middle: "Ринатович",
    groupId: group.khebo.id,
    programme: "Химическая технология",
    card: "23Х0855",
  });
  const irina = await db.user.create({
    data: {
      login: "i.sokolova",
      passwordHash,
      role: "staff",
      preferences: { create: {} },
      staffInstitutes: {
        create: [
          { instituteId: inst.ikb.id },
          { instituteId: inst.iii.id },
          { instituteId: inst.ith.id },
        ],
      },
    },
  });

  // Одногруппники: в каждой группе 27 человек, как в макетах
  const extrasByGroup: Record<
    string,
    { userId: string; profileId: string; name: string }[]
  > = {};
  let n = 0;
  for (const [key, g] of Object.entries(group)) {
    extrasByGroup[key] = [];
    const prefix = { biso: "25В", kmbo: "24И", khebo: "23Х" }[key]!;
    for (let i = 0; i < 26; i++, n++) {
      const last = EXTRA_LAST[(i + n) % EXTRA_LAST.length];
      const female = /а$|я$/.test(last);
      const firstPool = EXTRA_FIRST.filter((f) =>
        female ? /а$|я$/.test(f) : !/а$|я$/.test(f),
      );
      const first = firstPool[(i * 7 + n) % firstPool.length];
      const s = await student(
        {
          login: `demo.${key}.${i + 1}`,
          last,
          first,
          groupId: g.id,
          programme: "Демо",
          card: `${prefix}${String(9000 + n)}`,
        },
        true,
      );
      extrasByGroup[key].push({ ...s, name: `${last} ${first[0]}.` });
    }
  }

  // Старосты: Марат — своей группы (S6); у групп Данилы и Ксении — одногруппники
  await db.groupHead.create({
    data: { groupId: group.khebo.id, studentId: marat.profileId },
  });
  const bisoHead = extrasByGroup.biso[0];
  await db.groupHead.create({
    data: { groupId: group.biso.id, studentId: bisoHead.profileId },
  });
  await db.groupHead.create({
    data: {
      groupId: group.kmbo.id,
      studentId: extrasByGroup.kmbo[0].profileId,
    },
  });

  // ─── Расписание по неделям ────────────────────────────────────────────
  type Slot = {
    day: number;
    pair: number;
    subject: SubjectKey;
    kind: LessonKind;
    room: string;
    teacher: string;
  };
  const templates: Record<keyof typeof group, Slot[]> = {
    biso: [
      {
        day: 1,
        pair: 1,
        subject: "linalg",
        kind: "lecture",
        room: "А-305",
        teacher: "Плёсокручев",
      },
      {
        day: 1,
        pair: 2,
        subject: "calculus",
        kind: "practice",
        room: "А-301",
        teacher: "Ясноборов",
      },
      {
        day: 1,
        pair: 3,
        subject: "databases",
        kind: "lab",
        room: "В-201",
        teacher: "Тихосклонов",
      },
      {
        day: 2,
        pair: 2,
        subject: "programming",
        kind: "practice",
        room: "Б-120",
        teacher: "Лунноберегов",
      },
      {
        day: 2,
        pair: 3,
        subject: "english",
        kind: "practice",
        room: "Г-312",
        teacher: "Звёзднодолов",
      },
      {
        day: 2,
        pair: 4,
        subject: "linalg",
        kind: "practice",
        room: "А-118",
        teacher: "Плёсокручев",
      },
      {
        day: 3,
        pair: 1,
        subject: "history",
        kind: "lecture",
        room: "А-118",
        teacher: "Мшистопёров",
      },
      {
        day: 3,
        pair: 2,
        subject: "calculus",
        kind: "lecture",
        room: "А-214",
        teacher: "Ясноборов",
      },
      {
        day: 3,
        pair: 3,
        subject: "programming",
        kind: "lab",
        room: "Б-306",
        teacher: "Лунноберегов",
      },
      {
        day: 3,
        pair: 4,
        subject: "databases",
        kind: "practice",
        room: "В-105",
        teacher: "Тихосклонов",
      },
      {
        day: 3,
        pair: 6,
        subject: "pe",
        kind: "practice",
        room: "Зал-1",
        teacher: "Ветрянотропин",
      },
      {
        day: 4,
        pair: 1,
        subject: "english",
        kind: "practice",
        room: "Г-312",
        teacher: "Звёзднодолов",
      },
      {
        day: 4,
        pair: 2,
        subject: "linalg",
        kind: "practice",
        room: "А-305",
        teacher: "Плёсокручев",
      },
      {
        day: 5,
        pair: 1,
        subject: "physics",
        kind: "lecture",
        room: "Б-201",
        teacher: "Медовикова",
      },
      {
        day: 5,
        pair: 2,
        subject: "physics",
        kind: "lab",
        room: "Б-012",
        teacher: "Медовикова",
      },
      {
        day: 5,
        pair: 3,
        subject: "calculus",
        kind: "practice",
        room: "А-301",
        teacher: "Ясноборов",
      },
      {
        day: 5,
        pair: 6,
        subject: "pe",
        kind: "practice",
        room: "Зал-1",
        teacher: "Ветрянотропин",
      },
    ],
    kmbo: [
      {
        day: 1,
        pair: 2,
        subject: "ml",
        kind: "lecture",
        room: "В-310",
        teacher: "Росопадова",
      },
      {
        day: 1,
        pair: 3,
        subject: "stats",
        kind: "practice",
        room: "В-204",
        teacher: "Ясноборов",
      },
      {
        day: 2,
        pair: 1,
        subject: "databases",
        kind: "lecture",
        room: "В-105",
        teacher: "Тихосклонов",
      },
      {
        day: 2,
        pair: 2,
        subject: "databases",
        kind: "lab",
        room: "В-201",
        teacher: "Тихосклонов",
      },
      {
        day: 3,
        pair: 2,
        subject: "ml",
        kind: "lab",
        room: "В-312",
        teacher: "Росопадова",
      },
      {
        day: 3,
        pair: 3,
        subject: "english",
        kind: "practice",
        room: "Г-210",
        teacher: "Звёзднодолов",
      },
      {
        day: 4,
        pair: 1,
        subject: "stats",
        kind: "lecture",
        room: "А-214",
        teacher: "Ясноборов",
      },
      {
        day: 4,
        pair: 3,
        subject: "programming",
        kind: "lab",
        room: "Б-306",
        teacher: "Лунноберегов",
      },
      {
        day: 5,
        pair: 2,
        subject: "pe",
        kind: "practice",
        room: "Зал-1",
        teacher: "Ветрянотропин",
      },
    ],
    khebo: [
      {
        day: 1,
        pair: 1,
        subject: "orgchem",
        kind: "lecture",
        room: "Г-101",
        teacher: "Медовикова",
      },
      {
        day: 1,
        pair: 2,
        subject: "orgchem",
        kind: "lab",
        room: "Г-105",
        teacher: "Медовикова",
      },
      {
        day: 2,
        pair: 3,
        subject: "physchem",
        kind: "lecture",
        room: "Г-201",
        teacher: "Росопадова",
      },
      {
        day: 3,
        pair: 2,
        subject: "physchem",
        kind: "lab",
        room: "Г-205",
        teacher: "Росопадова",
      },
      {
        day: 4,
        pair: 2,
        subject: "english",
        kind: "practice",
        room: "Г-312",
        teacher: "Звёзднодолов",
      },
      {
        day: 5,
        pair: 1,
        subject: "history",
        kind: "lecture",
        room: "А-118",
        teacher: "Мшистопёров",
      },
      {
        day: 5,
        pair: 3,
        subject: "pe",
        kind: "practice",
        room: "Зал-1",
        teacher: "Ветрянотропин",
      },
    ],
  };

  // Добавляем пары в свободные окна, оставляя выходные и резервные слоты.
  const expandedCourses = {
    biso: {
      student: danila,
      teacher: "Листосклонова",
      room: "В-410",
      courses: [
        ["networks", "Настроить учебную сеть"],
        ["os", "Разобрать права доступа к файлам"],
        ["infosec", "Составить модель угроз для учебного проекта"],
      ],
    },
    kmbo: {
      student: ksenia,
      teacher: "Клеверосветов",
      room: "Б-418",
      courses: [
        ["optimization", "Решить задачу линейного программирования"],
        ["numerical", "Сравнить методы поиска корней"],
        ["visualization", "Подготовить диаграммы по учебным данным"],
      ],
    },
    khebo: {
      student: marat,
      teacher: "Янтарнорощина",
      room: "Г-415",
      courses: [
        ["processes", "Рассчитать параметры теплообменника"],
        ["analytical", "Подготовить отчёт по титрованию"],
        ["materials", "Сравнить свойства полимеров"],
        ["ecology", "Построить схему очистки воды"],
      ],
    },
  } satisfies Record<
    keyof typeof group,
    {
      student: typeof danila;
      teacher: string;
      room: string;
      courses: [SubjectKey, string][];
    }
  >;
  const groupKeys = ["biso", "kmbo", "khebo"] as const;
  for (const key of groupKeys) {
    const { teacher, room: classroom, courses } = expandedCourses[key];
    const slots = templates[key];
    let index = 0;
    for (const day of [1, 2, 3, 4, 5]) {
      const occupied = new Set(
        slots.filter((slot) => slot.day === day).map((slot) => slot.pair),
      );
      const target = day === 5 ? 4 : 5;
      for (const pair of [2, 3, 4, 5, 1, 6]) {
        if (occupied.size >= target) break;
        if (occupied.has(pair)) continue;
        slots.push({
          day,
          pair,
          subject: courses[index % courses.length][0],
          kind:
            index % 3 === 0 ? "lecture" : index % 3 === 1 ? "practice" : "lab",
          room: classroom,
          teacher,
        });
        occupied.add(pair);
        index++;
      }
    }
  }

  // У группы Данилы «сегодня» и «завтра» — ровно как в макетах
  const scriptedDays = new Set([today, tomorrow]);
  const lessonRows: Prisma.LessonCreateManyInput[] = [];
  const lessonTeachers: { key: string; teacherId: string }[] = [];
  for (const [gKey, slots] of Object.entries(templates) as [
    keyof typeof group,
    Slot[],
  ][]) {
    for (
      let day = TERM.startsOn;
      day <= TERM.lastTeachingDay;
      day = addDays(day, 1)
    ) {
      if (gKey === "biso" && scriptedDays.has(day)) continue;
      const wd = isoWeekday(day);
      for (const s of slots.filter((x) => x.day === wd)) {
        const [start, end] = PAIRS[s.pair];
        const id = crypto.randomUUID();
        lessonRows.push({
          id,
          groupId: group[gKey].id,
          subjectId: subjects[s.subject],
          termId: term.id,
          kind: s.kind,
          roomId: await room(s.room),
          startsAt: at(day, start),
          endsAt: at(day, end),
        });
        lessonTeachers.push({ key: id, teacherId: T(s.teacher) });
      }
    }
  }

  // Сценарий S1/S2: сегодня у БИСО-03-25
  type Scripted = {
    date: string;
    pair: number;
    subject: SubjectKey;
    kind: LessonKind;
    room: string;
    teacher: string;
    tag?: "moved" | "cancelled" | "online";
  };
  const scripted: Scripted[] = [
    {
      date: today,
      pair: 1,
      subject: "history",
      kind: "lecture",
      room: "А-118",
      teacher: "Мшистопёров",
    },
    {
      date: today,
      pair: 2,
      subject: "calculus",
      kind: "lecture",
      room: "А-214",
      teacher: "Ясноборов",
    },
    {
      date: today,
      pair: 3,
      subject: "programming",
      kind: "lab",
      room: "Б-306",
      teacher: "Лунноберегов",
    },
    {
      date: today,
      pair: 4,
      subject: "databases",
      kind: "practice",
      room: "В-105",
      teacher: "Тихосклонов",
      tag: "moved",
    },
    {
      date: today,
      pair: 6,
      subject: "pe",
      kind: "practice",
      room: "Зал-1",
      teacher: "Ветрянотропин",
      tag: "cancelled",
    },
    {
      date: tomorrow,
      pair: 1,
      subject: "english",
      kind: "practice",
      room: "Г-312",
      teacher: "Звёзднодолов",
      tag: "online",
    },
    {
      date: tomorrow,
      pair: 2,
      subject: "linalg",
      kind: "practice",
      room: "А-305",
      teacher: "Плёсокручев",
    },
    {
      date: tomorrow,
      pair: 3,
      subject: "networks",
      kind: "lab",
      room: expandedCourses.biso.room,
      teacher: expandedCourses.biso.teacher,
    },
    {
      date: tomorrow,
      pair: 4,
      subject: "os",
      kind: "practice",
      room: expandedCourses.biso.room,
      teacher: expandedCourses.biso.teacher,
    },
  ];
  const tagged: Record<string, string> = {};
  for (const s of scripted) {
    const [start, end] = PAIRS[s.pair];
    const id = crypto.randomUUID();
    lessonRows.push({
      id,
      groupId: group.biso.id,
      subjectId: subjects[s.subject],
      termId: term.id,
      kind: s.kind,
      roomId: await room(s.room),
      startsAt: at(s.date, start),
      endsAt: at(s.date, end),
    });
    lessonTeachers.push({ key: id, teacherId: T(s.teacher) });
    if (s.tag) tagged[s.tag] = id;
  }
  await db.lesson.createMany({ data: lessonRows });
  await db.lessonTeacher.createMany({
    data: lessonTeachers.map((x) => ({
      lessonId: x.key,
      teacherId: x.teacherId,
    })),
  });

  // Изменения публикует Ирина (дирекция) сегодня в 08:12
  const bisoUsers = [danila.userId, ...extrasByGroup.biso.map((x) => x.userId)];
  const changedAt = at(today, "08:12");
  async function change(
    lessonId: string,
    kind: "moved" | "cancelled" | "format_changed",
    patch: Prisma.LessonUpdateInput & { startsAt?: Date; endsAt?: Date },
    title: string,
    body: string,
    reason: string,
  ) {
    const before = await db.lesson.findUniqueOrThrow({
      where: { id: lessonId },
    });
    const after = await db.lesson.update({
      where: { id: lessonId },
      data: { ...patch, version: { increment: 1 } },
    });
    const lc = await db.lessonChange.create({
      data: {
        lessonId,
        version: after.version,
        kind,
        authorId: irina.id,
        authorRole: "staff",
        publishedAt: changedAt,
        reason,
        previousStartsAt: before.startsAt,
        newStartsAt: after.startsAt,
        previousEndsAt: before.endsAt,
        newEndsAt: after.endsAt,
        previousFormat: before.format,
        newFormat: after.format,
        previousRoomId: before.roomId,
        newRoomId: after.roomId,
        previousOnlineUrl: before.onlineUrl,
        newOnlineUrl: after.onlineUrl,
        previousStatus: before.status,
        newStatus: after.status,
      },
    });
    await db.notification.create({
      data: {
        kind: "lesson_change",
        importance: "urgent",
        publishedAt: changedAt,
        eventKey: `lesson:${lessonId}:v${after.version}`,
        title,
        body,
        lessonChangeId: lc.id,
        recipients: {
          create: bisoUsers.map((userId, i) => ({
            userId,
            // Прочитали почти все, кроме Данилы и пары одногруппников
            readAt:
              userId === danila.userId || i > 24 ? null : at(today, "08:30"),
          })),
        },
      },
    });
  }
  await change(
    tagged.moved,
    "moved",
    { startsAt: at(today, PAIRS[5][0]), endsAt: at(today, PAIRS[5][1]) },
    "Базы данных сегодня в 16:20, а не в 14:20",
    "Аудитория та же — В-105. Перенесла дирекция ИКБ.",
    "Преподаватель на конференции до обеда",
  );
  await change(
    tagged.cancelled,
    "cancelled",
    { status: "cancelled" },
    "Физкультура сегодня в 18:00 отменена",
    "Преподаватель заболел. Пары не будет.",
    "Преподаватель заболел",
  );
  await change(
    tagged.online,
    "format_changed",
    {
      format: "online",
      room: { disconnect: true },
      onlineUrl: "https://example.org/demo-meet/english",
    },
    "Английский завтра — онлайн",
    "Аудитория Г-312 не нужна, ссылка — в паре.",
    "Ремонт в корпусе Г",
  );

  // ─── Оценки и допуск ─────────────────────────────────────────────────
  async function rating(
    groupId: string,
    studentId: string,
    subject: SubjectKey,
    items: {
      title: string;
      kind: AssessmentKind;
      max: number;
      got: number | null;
    }[],
  ) {
    for (const it of items) {
      const a = await db.assessment.create({
        data: {
          groupId,
          subjectId: subjects[subject],
          termId: term.id,
          kind: it.kind,
          title: it.title,
          maxPoints: it.max,
        },
      });
      if (it.got !== null) {
        await db.assessmentResult.create({
          data: {
            studentId,
            assessmentId: a.id,
            scale: "points100",
            value: it.got,
            publishedAt: at(addDays(today, -3), "18:00"),
          },
        });
      }
    }
  }
  // Данила: БД 58 (3 из 5 лаб — риск), Матанализ 74, Программирование 81, История 65, Английский 70
  await rating(group.biso.id, danila.profileId, "databases", [
    { title: "Лаба 1", kind: "lab", max: 14, got: 12 },
    { title: "Лаба 2", kind: "lab", max: 14, got: 14 },
    { title: "Лаба 3", kind: "lab", max: 14, got: 12 },
    { title: "Лаба 4 · нормализация", kind: "lab", max: 14, got: null },
    { title: "Лаба 5 · индексы", kind: "lab", max: 14, got: null },
    { title: "Контрольная", kind: "test", max: 30, got: 20 },
  ]);
  await rating(group.biso.id, danila.profileId, "calculus", [
    { title: "Контрольная 1", kind: "test", max: 35, got: 30 },
    { title: "Контрольная 2", kind: "test", max: 35, got: 26 },
    { title: "Работа на практиках", kind: "practice", max: 30, got: 18 },
  ]);
  await rating(group.biso.id, danila.profileId, "programming", [
    { title: "Лаба 1", kind: "lab", max: 20, got: 17 },
    { title: "Лаба 2", kind: "lab", max: 20, got: 17 },
    { title: "Лаба 3", kind: "lab", max: 20, got: 16 },
    { title: "Лаба 4", kind: "lab", max: 20, got: 16 },
    { title: "Посещаемость", kind: "attendance", max: 20, got: 15 },
  ]);
  await rating(group.biso.id, danila.profileId, "history", [
    { title: "Реферат", kind: "essay", max: 40, got: 33 },
    { title: "Семинары", kind: "practice", max: 60, got: 32 },
  ]);
  await rating(group.biso.id, danila.profileId, "english", [
    { title: "Посещаемость", kind: "attendance", max: 40, got: 36 },
    { title: "Устные темы", kind: "practice", max: 60, got: 34 },
  ]);
  await db.studentTermStanding.create({
    data: { studentId: danila.profileId, termId: term.id, status: "at_risk" },
  });
  await db.admissionItem.createMany({
    data: [
      {
        studentId: danila.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лабы 1–3",
        status: "done",
        sortOrder: 1,
      },
      {
        studentId: danila.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лаба 4 · нормализация",
        dueAt: at("2026-12-06", "23:59"),
        status: "pending",
        sortOrder: 2,
      },
      {
        studentId: danila.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лаба 5 · индексы",
        dueAt: at("2026-12-20", "23:59"),
        status: "pending",
        sortOrder: 3,
      },
    ],
  });

  // Ксения: S5 — риск по базам данных, «3 из 5 лаб сдано, срок 20.12»
  await rating(group.kmbo.id, ksenia.profileId, "databases", [
    { title: "Лаба 1", kind: "lab", max: 15, got: 12 },
    { title: "Лаба 2", kind: "lab", max: 15, got: 12 },
    { title: "Лаба 3", kind: "lab", max: 15, got: 12 },
    { title: "Лаба 4", kind: "lab", max: 15, got: null },
    { title: "Лаба 5", kind: "lab", max: 15, got: null },
    { title: "Контрольная", kind: "test", max: 25, got: 12 },
  ]);
  await rating(group.kmbo.id, ksenia.profileId, "ml", [
    { title: "Лабы", kind: "lab", max: 70, got: 61 },
    { title: "Проект", kind: "practice", max: 30, got: 26 },
  ]);
  await rating(group.kmbo.id, ksenia.profileId, "stats", [
    { title: "Контрольные", kind: "test", max: 100, got: 79 },
  ]);
  await db.studentTermStanding.create({
    data: { studentId: ksenia.profileId, termId: term.id, status: "at_risk" },
  });
  await db.admissionItem.createMany({
    data: [
      {
        studentId: ksenia.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лабы 1–3",
        status: "done",
        sortOrder: 1,
      },
      {
        studentId: ksenia.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лаба 4",
        dueAt: at("2026-12-06", "23:59"),
        status: "pending",
        sortOrder: 2,
      },
      {
        studentId: ksenia.profileId,
        subjectId: subjects.databases,
        termId: term.id,
        title: "Лаба 5",
        dueAt: at("2026-12-20", "23:59"),
        status: "pending",
        sortOrder: 3,
      },
    ],
  });
  for (const key of groupKeys) {
    const { student: demoStudent, courses } = expandedCourses[key];
    for (const [index, [subject, title]] of courses.entries()) {
      const profileId = demoStudent.profileId;
      await rating(group[key].id, profileId, subject, [
        {
          title: "Самостоятельная работа",
          kind: "practice",
          max: 30,
          got: 24 + index,
        },
        { title, kind: "lab", max: 40, got: index % 2 === 0 ? 35 : null },
        {
          title: "Итоговая контрольная",
          kind: "test",
          max: 30,
          got: index % 2 === 0 ? 26 : null,
        },
      ]);
      if (index % 2 !== 0) {
        await db.admissionItem.create({
          data: {
            studentId: profileId,
            subjectId: subjects[subject],
            termId: term.id,
            title,
            dueAt: at(addDays(today, 4 + index), "18:00"),
            status: "pending",
            sortOrder: 1,
          },
        });
      }
      await db.subjectAchievement.create({
        data: {
          studentId: profileId,
          subjectId: subjects[subject],
          termId: term.id,
          title: "Представить свой вариант решения на семинаре",
          earned: index % 3 === 0,
        },
      });
    }
  }

  // Отметки вымышленного журнала только для уже проведённых занятий.
  for (const [studentId, groupId] of [
    [danila.profileId, group.biso.id],
    [ksenia.profileId, group.kmbo.id],
    [marat.profileId, group.khebo.id],
  ]) {
    const lessons = await db.lesson.findMany({
      where: {
        groupId,
        termId: term.id,
        status: "scheduled",
        endsAt: { lt: at(today, "00:00") },
      },
      select: { id: true },
      orderBy: [{ startsAt: "asc" }, { subjectId: "asc" }],
    });
    await db.lessonAttendance.createMany({
      data: lessons.map((lesson, index) => ({
        studentId,
        lessonId: lesson.id,
        present: index % 7 !== 2,
      })),
    });
  }
  await db.subjectAchievement.createMany({
    data: [
      {
        studentId: ksenia.profileId,
        subjectId: subjects.databases,
        title: "Спроектировать схему для студенческого проекта",
        earned: true,
      },
      {
        studentId: ksenia.profileId,
        subjectId: subjects.databases,
        title: "Разобрать план запроса на семинаре",
        earned: false,
      },
      {
        studentId: danila.profileId,
        subjectId: subjects.databases,
        title: "Решить дополнительную задачу по индексам",
        earned: false,
      },
      {
        studentId: danila.profileId,
        subjectId: subjects.calculus,
        title: "Представить альтернативное доказательство",
        earned: true,
      },
      {
        studentId: ksenia.profileId,
        subjectId: subjects.ml,
        title: "Сравнить две модели на открытом наборе данных",
        earned: true,
      },
    ].map((item) => ({ ...item, termId: term.id })),
  });

  // Прошлая сессия Ксении (весна 2026): средний 4,6
  const spring = await db.academicTerm.create({
    data: {
      name: "Весенний семестр 2025/26",
      startsOn: new Date("2026-02-09"),
      endsOn: new Date("2026-06-30"),
      sessionStartsOn: new Date("2026-06-08"),
    },
  });
  for (const [subject, grade] of [
    ["calculus", 5],
    ["programming", 4],
    ["english", 5],
    ["physics", 4],
    ["history", 5],
  ] as [SubjectKey, number][]) {
    const a = await db.assessment.create({
      data: {
        groupId: group.kmbo.id,
        subjectId: subjects[subject],
        termId: spring.id,
        kind: "exam",
        title: "Экзамен",
        heldOn: new Date("2026-06-15"),
      },
    });
    await db.assessmentResult.create({
      data: {
        studentId: ksenia.profileId,
        assessmentId: a.id,
        scale: "grade5",
        value: grade,
        publishedAt: at("2026-06-20", "12:00"),
      },
    });
  }

  // ─── Дедлайны и объявления ───────────────────────────────────────────
  async function deadline(opts: {
    title: string;
    body?: string;
    subject?: SubjectKey;
    dueAt: Date;
    authorId: string;
    authorRole: "staff" | "group_head";
    groups: string[];
    recipients: string[];
    readAll?: boolean;
    publishedAt: Date;
  }) {
    const d = await db.deadline.create({
      data: {
        title: opts.title,
        body: opts.body,
        subjectId: opts.subject ? subjects[opts.subject] : undefined,
        dueAt: opts.dueAt,
        authorId: opts.authorId,
        authorRole: opts.authorRole,
        publishedAt: opts.publishedAt,
        groups: { create: opts.groups.map((groupId) => ({ groupId })) },
        reminders: {
          create: [
            {
              dueVersion: 1,
              offset: "d3",
              scheduledAt: new Date(opts.dueAt.getTime() - 3 * 864e5),
            },
            {
              dueVersion: 1,
              offset: "d1",
              scheduledAt: new Date(opts.dueAt.getTime() - 864e5),
            },
          ],
        },
      },
    });
    await db.notification.create({
      data: {
        kind: "deadline",
        publishedAt: opts.publishedAt,
        eventKey: `deadline:${d.id}:v1`,
        title: opts.title,
        body: opts.body,
        deadlineId: d.id,
        recipients: {
          create: opts.recipients.map((userId) => ({
            userId,
            readAt: opts.readAll ? opts.publishedAt : null,
          })),
        },
      },
    });
    return d;
  }
  const kmboUsers = [ksenia.userId, ...extrasByGroup.kmbo.map((x) => x.userId)];
  const kheboUsers = [
    marat.userId,
    ...extrasByGroup.khebo.map((x) => x.userId),
  ];

  await deadline({
    title: "Контрольная по линейной алгебре",
    body: "Разделы 1–4, с собой калькулятор.",
    subject: "linalg",
    dueAt: at(addDays(today, 2), "18:00"),
    authorId: irina.id,
    authorRole: "staff",
    groups: [group.biso.id],
    recipients: bisoUsers,
    readAll: true,
    publishedAt: at(addDays(today, -5), "10:00"),
  });
  await deadline({
    title: "Лаба № 3 по базам данных",
    body: "Сдать отчёт в системе курса.",
    subject: "databases",
    dueAt: at(addDays(today, 6), "23:59"),
    authorId: bisoHead.userId,
    authorRole: "group_head",
    groups: [group.biso.id],
    recipients: bisoUsers,
    readAll: true,
    publishedAt: at(addDays(today, -1), "19:30"),
  });
  await deadline({
    title: "Лабы 4–5 по базам данных — для допуска",
    subject: "databases",
    dueAt: at("2026-12-20", "23:59"),
    authorId: irina.id,
    authorRole: "staff",
    groups: [group.kmbo.id],
    recipients: kmboUsers,
    publishedAt: at(addDays(today, -2), "11:00"),
  });
  // S6: опубликовано старостой Маратом — «прочитали 21 из 24» в макете, здесь 21 из 26
  await deadline({
    title: "Коллоквиум по физхимии",
    subject: "physchem",
    dueAt: at(addDays(today, 3), "12:40"),
    authorId: marat.userId,
    authorRole: "group_head",
    groups: [group.khebo.id],
    recipients: kheboUsers.filter((u) => u !== marat.userId),
    publishedAt: at(addDays(today, -1), "18:40"),
  });
  await db.notificationRecipient.updateMany({
    where: {
      notification: { title: "Коллоквиум по физхимии" },
      userId: { in: kheboUsers.slice(1, 22) },
    },
    data: { readAt: at(today, "09:00") },
  });

  const recipientsByGroup = {
    biso: bisoUsers,
    kmbo: kmboUsers,
    khebo: kheboUsers,
  };
  for (const key of groupKeys) {
    for (const [index, [subject, title]] of expandedCourses[key].courses
      .slice(0, 2)
      .entries()) {
      await deadline({
        title,
        subject,
        dueAt: at(addDays(today, 2 + index * 3), "18:00"),
        publishedAt: at(addDays(today, -3), "12:00"),
        authorId: irina.id,
        authorRole: "staff",
        groups: [group[key].id],
        recipients: recipientsByGroup[key],
        readAll: index === 0,
      });
    }
  }

  const ann = await db.announcement.create({
    data: {
      authorId: irina.id,
      authorRole: "staff",
      title: "Матпомощь: документы принимают до 28-го",
      body: "Заявления на материальную помощь рассматривает комиссия раз в месяц. Документы — до 28-го числа (п. 7.4 положения).",
      publishedAt: at(addDays(today, -2), "17:40"),
      groups: { create: Object.values(group).map((g) => ({ groupId: g.id })) },
    },
  });
  await db.notification.create({
    data: {
      kind: "announcement",
      publishedAt: ann.publishedAt,
      eventKey: `announcement:${ann.id}`,
      title: ann.title,
      body: ann.body,
      announcementId: ann.id,
      recipients: {
        create: [...bisoUsers, ...kmboUsers, ...kheboUsers].map((userId) => ({
          userId,
          readAt: ann.publishedAt,
        })),
      },
    },
  });

  // ─── Заявки ──────────────────────────────────────────────────────────
  const field = (
    key: string,
    label: string,
    type: "text" | "number",
    required = true,
    max?: number,
  ) => ({ key, label, type, required, max });
  const types = {
    study: await db.applicationType.create({
      data: {
        code: "study_certificate",
        title: "Справка об обучении",
        leadTime: "2–3 дня",
        sortOrder: 1,
        deliveryMethods: ["pickup", "electronic"],
        fields: [
          field("destination", "Куда нужна справка", "text"),
          field("copies", "Сколько экземпляров", "number", true, 3),
        ],
      },
    }),
    military: await db.applicationType.create({
      data: {
        code: "military_certificate",
        title: "Справка для военкомата",
        leadTime: "3–5 дней",
        sortOrder: 2,
        deliveryMethods: ["pickup"],
        fields: [
          field("commissariat", "Военкомат", "text"),
          field("copies", "Сколько экземпляров", "number", true, 3),
        ],
      },
    }),
    stipend: await db.applicationType.create({
      data: {
        code: "stipend_certificate",
        title: "Справка о стипендии",
        leadTime: "2–3 дня",
        sortOrder: 3,
        deliveryMethods: ["pickup", "electronic"],
        fields: [
          field("period", "За какой период", "text"),
          field("copies", "Сколько экземпляров", "number", true, 3),
        ],
      },
    }),
    retake: await db.applicationType.create({
      data: {
        code: "retake",
        title: "Заявление на пересдачу",
        leadTime: "до 7 дней",
        sortOrder: 4,
        deliveryMethods: ["electronic"],
        fields: [
          field("subject", "Дисциплина", "text"),
          field("reason", "Причина", "text", false),
        ],
      },
    }),
    raisedStipend: await db.applicationType.create({
      data: {
        code: "raised_stipend",
        title: "Повышенная стипендия",
        leadTime: "до 14 дней",
        sortOrder: 5,
        deliveryMethods: ["electronic"],
        fields: [field("achievements", "Достижения", "text")],
      },
    }),
    aid: await db.applicationType.create({
      data: {
        code: "material_aid",
        title: "Материальная помощь",
        leadTime: "до 10-го числа",
        sortOrder: 6,
        deliveryMethods: ["electronic"],
        fields: [field("situation", "Опиши ситуацию", "text")],
      },
    }),
  };

  const transcript = await db.applicationType.create({
    data: {
      code: "academic_transcript",
      title: "Выписка об успеваемости",
      leadTime: "3–5 дней",
      sortOrder: 7,
      deliveryMethods: ["pickup", "electronic"],
      fields: [
        field("period", "За какой период", "text"),
        field("destination", "Куда нужна выписка", "text", false),
      ],
    },
  });
  const duplicateCard = await db.applicationType.create({
    data: {
      code: "student_card_duplicate",
      title: "Дубликат студенческого билета",
      leadTime: "до 7 дней",
      sortOrder: 8,
      deliveryMethods: ["pickup"],
      fields: [field("reason", "Почему нужен дубликат", "text")],
    },
  });
  const consultation = await db.applicationType.create({
    data: {
      code: "study_consultation",
      title: "Консультация по учёбе",
      leadTime: "1–2 дня",
      sortOrder: 9,
      deliveryMethods: ["electronic"],
      fields: [
        field("topic", "Тема консультации", "text"),
        field("availability", "Когда удобно", "text", false),
      ],
    },
  });
  const personalUpdate = await db.applicationType.create({
    data: {
      code: "profile_correction",
      title: "Уточнение данных в профиле",
      leadTime: "до 5 дней",
      sortOrder: 10,
      deliveryMethods: ["electronic"],
      fields: [field("description", "Что нужно уточнить", "text")],
    },
  });

  const snapshot = (
    last: string,
    first: string,
    middle: string | undefined,
    groupCode: string,
  ) => ({
    lastName: last,
    firstName: first,
    middleName: middle ?? null,
    group: groupCode,
  });
  async function application(opts: {
    number: number;
    studentId: string;
    groupId: string;
    typeId: string;
    formData: Prisma.InputJsonValue;
    profile: Prisma.InputJsonValue;
    delivery: "pickup" | "electronic";
    studentUserId: string;
    events: {
      to: "submitted" | "in_progress" | "ready" | "issued" | "rejected";
      at: Date;
      by: string;
      reason?: string;
      pickup?: string;
    }[];
  }) {
    const last = opts.events[opts.events.length - 1];
    const app = await db.application.create({
      data: {
        number: opts.number,
        studentId: opts.studentId,
        typeId: opts.typeId,
        submissionGroupId: opts.groupId,
        formData: opts.formData,
        profileSnapshot: opts.profile,
        deliveryMethod: opts.delivery,
        status: last.to,
        submittedAt: opts.events[0].at,
        version: opts.events.length,
      },
    });
    let prev: (typeof opts.events)[number]["to"] | null = null;
    for (const [i, e] of opts.events.entries()) {
      const ev = await db.applicationStatusEvent.create({
        data: {
          applicationId: app.id,
          version: i + 1,
          fromStatus: prev,
          toStatus: e.to,
          authorId: e.by,
          createdAt: e.at,
          rejectReason: e.reason,
          pickupNote: e.pickup,
        },
      });
      if (i > 0) {
        await db.notification.create({
          data: {
            kind: "application_status",
            importance:
              e.to === "ready" || e.to === "rejected" ? "urgent" : "normal",
            publishedAt: e.at,
            eventKey: `application:${app.id}:v${i + 1}`,
            title: {
              in_progress: "Заявка в работе",
              ready: "Справка готова",
              issued: "Справка выдана",
              rejected: "Заявку вернули",
              submitted: "Заявка подана",
            }[e.to],
            body: e.reason ?? e.pickup ?? null,
            statusEventId: ev.id,
            recipients: {
              create: [
                {
                  userId: opts.studentUserId,
                  readAt: e.to === "ready" ? null : e.at,
                },
              ],
            },
          },
        });
      }
      prev = e.to;
    }
    return app;
  }

  const danilaSnap = snapshot("Северов", "Данила", "Ильич", "БИСО-03-25");
  await application({
    number: 187,
    studentId: danila.profileId,
    groupId: group.biso.id,
    typeId: types.study.id,
    studentUserId: danila.userId,
    formData: { destination: "По месту требования", copies: 2 },
    profile: danilaSnap,
    delivery: "pickup",
    events: [
      {
        to: "submitted",
        at: at(addDays(today, -2), "19:02"),
        by: danila.userId,
      },
      { to: "in_progress", at: at(addDays(today, -1), "09:15"), by: irina.id },
      {
        to: "ready",
        at: at(today, "08:40"),
        by: irina.id,
        pickup: "Кабинет 214, до пятницы, 10:00–17:00",
      },
    ],
  });
  await application({
    number: 192,
    studentId: danila.profileId,
    groupId: group.biso.id,
    typeId: types.military.id,
    studentUserId: danila.userId,
    formData: {
      commissariat: "Военный комиссариат (демо), форма 26",
      copies: 1,
    },
    profile: danilaSnap,
    delivery: "pickup",
    events: [
      {
        to: "submitted",
        at: at(addDays(today, -1), "16:44"),
        by: danila.userId,
      },
      { to: "in_progress", at: at(today, "09:05"), by: irina.id },
    ],
  });
  await application({
    number: 179,
    studentId: danila.profileId,
    groupId: group.biso.id,
    typeId: types.aid.id,
    studentUserId: danila.userId,
    formData: { situation: "Сложное материальное положение семьи" },
    profile: danilaSnap,
    delivery: "electronic",
    events: [
      {
        to: "submitted",
        at: at(addDays(today, -8), "13:20"),
        by: danila.userId,
      },
      {
        to: "rejected",
        at: at(addDays(today, -4), "15:10"),
        by: irina.id,
        reason:
          "Нужна справка о составе семьи. Приложи её и подай снова (п. 7.3 положения).",
      },
    ],
  });
  // Очередь дирекции — заявки одногруппников (имена вымышленные)
  const queue: [
    number,
    keyof typeof group,
    number,
    keyof typeof queueForms,
    ("submitted" | "in_progress" | "ready" | "issued")[],
    number,
  ][] = [
    [195, "biso", 3, "study", ["submitted"], 0],
    [196, "kmbo", 4, "stipend", ["submitted"], 0],
    [189, "biso", 5, "retake", ["submitted", "in_progress"], -2],
    [
      183,
      "khebo",
      6,
      "military",
      ["submitted", "in_progress", "ready", "issued"],
      -5,
    ],
  ];
  const queueForms = {
    study: { destination: "По месту требования", copies: 1 },
    stipend: { period: "Октябрь 2026", copies: 1 },
    retake: { subject: "Математический анализ" },
    military: { commissariat: "Военный комиссариат (демо)", copies: 1 },
  };
  for (const [number, gKey, idx, typeKey, chain, offset] of queue) {
    const st = extrasByGroup[gKey][idx];
    const profile = await db.studentProfile.findUniqueOrThrow({
      where: { id: st.profileId },
      include: { group: true },
    });
    await application({
      number,
      studentId: st.profileId,
      groupId: group[gKey].id,
      typeId: types[typeKey].id,
      studentUserId: st.userId,
      formData: queueForms[typeKey],
      profile: snapshot(
        profile.lastName,
        profile.firstName,
        profile.middleName ?? undefined,
        profile.group.code,
      ),
      delivery: types[typeKey].deliveryMethods[0],
      events: chain.map((to, i) => ({
        to,
        at: at(addDays(today, offset + i), i === 0 ? "11:30" : "10:00"),
        by: i === 0 ? st.userId : irina.id,
        pickup: to === "ready" ? "Кабинет 214" : undefined,
      })),
    });
  }
  type DemoApplication = Parameters<typeof application>[0];
  type DemoStatus = DemoApplication["events"][number]["to"];
  const demoRequests: {
    typeId: string;
    formData: DemoApplication["formData"];
    delivery: DemoApplication["delivery"];
    chain: DemoStatus[];
  }[] = [
    {
      typeId: transcript.id,
      formData: { period: "Текущий семестр" },
      delivery: "electronic",
      chain: ["submitted", "in_progress"],
    },
    {
      typeId: duplicateCard.id,
      formData: { reason: "Повреждён держатель билета" },
      delivery: "pickup",
      chain: ["submitted", "in_progress", "ready"],
    },
    {
      typeId: consultation.id,
      formData: {
        topic: "Как закрыть лабораторные до сессии",
        availability: "После 16:00",
      },
      delivery: "electronic",
      chain: ["submitted"],
    },
    {
      typeId: personalUpdate.id,
      formData: { description: "Уточнить название образовательной программы" },
      delivery: "electronic",
      chain: ["submitted", "in_progress", "rejected"],
    },
    {
      typeId: types.stipend.id,
      formData: { period: "Октябрь 2026", copies: 1 },
      delivery: "pickup",
      chain: ["submitted", "in_progress", "ready", "issued"],
    },
  ];
  let number = 197;
  for (const key of groupKeys) {
    const demoStudent = expandedCourses[key].student;
    const profile = await db.studentProfile.findUniqueOrThrow({
      where: { id: demoStudent.profileId },
    });
    for (const [index, request] of demoRequests.entries()) {
      await application({
        number: number++,
        studentId: demoStudent.profileId,
        studentUserId: demoStudent.userId,
        groupId: group[key].id,
        typeId: request.typeId,
        formData: request.formData,
        delivery: request.delivery,
        profile: snapshot(
          profile.lastName,
          profile.firstName,
          profile.middleName ?? undefined,
          group[key].code,
        ),
        events: request.chain.map((to, step) => ({
          to,
          at: at(addDays(today, -13 - index + step), "11:30"),
          by: step === 0 ? demoStudent.userId : irina.id,
          reason:
            to === "rejected"
              ? "Укажи, как именно должна называться программа."
              : undefined,
          pickup: to === "ready" ? "Кабинет 214, 10:00–17:00" : undefined,
        })),
      });
    }
  }

  // Номера заявок задали вручную — сдвигаем счётчик, чтобы новые не совпали
  await db.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Application"', 'number'), (SELECT MAX("number") FROM "Application"))`,
  );

  // Окна выдачи справок (A3): будущие будние дни, после обеденного перерыва.
  const slots = [];
  for (const institute of [inst.ikb, inst.iii, inst.ith]) {
    for (let offset = 2; offset <= 9; offset++) {
      const day = addDays(today, offset);
      if (new Date(`${day}T12:00:00+03:00`).getUTCDay() % 6 === 0) continue;
      for (const time of ["14:00", "15:40", "16:30"]) {
        const startsAt = at(day, time);
        slots.push({
          instituteId: institute.id,
          place: "Кабинет 214",
          startsAt,
          endsAt: new Date(startsAt.getTime() + 20 * 60_000),
        });
      }
    }
  }
  await db.pickupSlot.createMany({ data: slots });

  // ─── Документ помощника ──────────────────────────────────────────────
  await db.helpDocument.create({
    data: {
      title: "Положение об учёбе и услугах дирекции ВТУ ВИРЭА (демо)",
      source: "docs/knowledge/polozhenie-demo.md",
      version: "1.0",
      publishedAt: new Date(),
      sections: {
        create: sections.map((s, i) => ({
          number: s.number,
          heading: s.heading,
          text: s.text,
          sortOrder: i,
        })),
      },
    },
  });

  // ─── Итог ────────────────────────────────────────────────────────────
  const counts = {
    users: await db.user.count(),
    lessons: await db.lesson.count(),
    changes: await db.lessonChange.count(),
    notifications: await db.notification.count(),
    applications: await db.application.count(),
    helpSections: await db.helpDocumentSection.count(),
  };
  console.log(`Демо-данные на ${today}:`, counts);
  console.log(
    "Тестовые логины: d.severov (студент), k.lavrova (студентка, риск недопуска), m.gainullin (староста), i.sokolova (дирекция).",
  );
  if (!process.env.SEED_PASSWORD) {
    console.log(
      `Пароль для всех четырёх (сгенерирован, в репозиторий не сохраняется): ${password}`,
    );
  } else {
    console.log("Пароль для всех четырёх — из SEED_PASSWORD.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
