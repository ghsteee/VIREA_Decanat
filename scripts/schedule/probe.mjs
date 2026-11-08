import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://schedule-of.mirea.ru';
const day = 86_400_000;
const moscowOffset = 3 * 3_600_000;
const lessonTypes = { ЛК: 'lecture', ПР: 'practice', ЛАБ: 'lab', СР: 'selfStudy', ДОП: 'additional' };

function normalize(value) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase().replaceAll('ё', 'е');
}

function fictionalName(value) {
  const digest = createHash('sha256').update(normalize(value)).digest();
  const given = ['Илья', 'Павел', 'Денис', 'Фёдор', 'Лев', 'Антон', 'Арсений', 'Глеб'];
  const patronymic = ['Андреевич', 'Ильич', 'Павлович', 'Олегович', 'Львович', 'Петрович', 'Денисович', 'Романович'];
  const stem = ['Ясно', 'Туманно', 'Лазурно', 'Тихо', 'Ветряно', 'Лунно', 'Мшисто', 'Звёздно'];
  const ending = ['боров', 'кручев', 'долов', 'склонов', 'берегов', 'плёсов', 'ложбин', 'тропин'];
  return [stem[digest[0] % 8] + ending[digest[1] % 8], given[digest[2] % 8], patronymic[digest[3] % 8]].join(' ');
}

function textValue(value) {
  return value.replace(/\\([nN,;\\])/g, (_, ch) => /[nN]/.test(ch) ? ' ' : ch).trim();
}

function calendarTime(value, params = {}) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match || (params.TZID && params.TZID !== 'Europe/Moscow')) {
    throw new Error('Неподдерживаемая дата или часовой пояс в календаре.');
  }
  const [, year, month, date, hours, minutes, seconds, utc] = match;
  // Число миллисекунд на условной шкале московского местного времени.
  return Date.UTC(+year, +month - 1, +date, +hours, +minutes, +seconds) + (utc ? moscowOffset : 0);
}

function parseEvent(block) {
  const properties = new Map();
  for (const line of block.split('\n')) {
    const match = /^((?:[^":]|"[^"]*")+):(.*)$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    const [name, ...params] = key.split(';');
    const parameterPairs = params.map(part => part.split('=', 2));
    const property = { value, params: Object.fromEntries(parameterPairs) };
    if (!properties.has(name)) properties.set(name, []);
    properties.get(name).push(property);
  }
  return properties;
}

function occurrenceInWeek(event, start, weekStart) {
  if (event.has('RECURRENCE-ID') || event.has('RDATE')) {
    throw new Error('Календарь содержит особый перенос или дополнительную дату. Схему пробы надо обновить.');
  }
  const rule = event.get('RRULE')?.[0]?.value;
  let occurrence = start;
  if (rule) {
    const parts = Object.fromEntries(rule.split(';').map(part => part.split('=')));
    if (parts.FREQ !== 'WEEKLY' || ![undefined, '1', '2'].includes(parts.INTERVAL)
        || Object.keys(parts).some(key => !['FREQ', 'INTERVAL', 'UNTIL'].includes(key))) {
      throw new Error('Календарь использует неподдерживаемое правило повторения.');
    }
    const interval = Number(parts.INTERVAL ?? 1) * 7 * day;
    occurrence += Math.max(0, Math.ceil((weekStart - start) / interval)) * interval;
    if (parts.UNTIL && occurrence > calendarTime(parts.UNTIL)) return null;
  }
  if (occurrence < weekStart || occurrence >= weekStart + 7 * day) return null;
  const excluded = (event.get('EXDATE') ?? []).some(({ value, params }) =>
    value.split(',').filter(Boolean).some(date => calendarTime(date, params) === occurrence));
  return excluded ? null : occurrence;
}

function weekCards(ical, weekStart) {
  const unfolded = ical.replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '').replace(/\r\n/g, '\n');
  if (!unfolded.startsWith('BEGIN:VCALENDAR\n') || !unfolded.trimEnd().endsWith('END:VCALENDAR')) {
    throw new Error('Источник вернул ответ без полного календаря iCal.');
  }
  const cards = [];
  for (const [, block] of unfolded.matchAll(/^BEGIN:VEVENT\n([\s\S]*?)^END:VEVENT$/gm)) {
    const event = parseEvent(block);
    const first = name => event.get(name)?.[0];
    const start = first('DTSTART');
    if (start?.params.VALUE === 'DATE' || first('STATUS')?.value === 'CANCELLED') continue;
    const end = first('DTEND');
    const discipline = first('X-META-DISCIPLINE');
    const type = first('X-META-LESSON_TYPE');
    if (!start || !end || !discipline?.value || !type?.value) {
      throw new Error('В календаре изменился формат метаданных занятия.');
    }

    const startTime = calendarTime(start.value, start.params);
    const duration = calendarTime(end.value, end.params) - startTime;
    if (duration <= 0 || duration >= day) throw new Error('В календаре некорректная длительность занятия.');
    const occurrence = occurrenceInWeek(event, startTime, weekStart);
    if (occurrence === null) continue;

    const room = first('X-META-AUDITORIUM')?.params;
    const location = first('LOCATION')?.value ?? '';
    const online = /дистанцион/i.test(room?.NUMBER ?? location) || room?.CAMPUS === 'СДО';
    const teachers = (event.get('X-META-TEACHER') ?? [])
      .map(({ value }) => textValue(value))
      .filter(Boolean)
      .map(fictionalName);
    const iso = new Date(occurrence).toISOString();
    cards.push({
      date: iso.slice(0, 10),
      startTime: iso.slice(11, 16),
      endTime: new Date(occurrence + duration).toISOString().slice(11, 16),
      discipline: textValue(discipline.value),
      type: Object.hasOwn(lessonTypes, type.value) ? lessonTypes[type.value] : 'other',
      teachers: [...new Set(teachers)],
      room: online ? null : room?.NUMBER || null,
      campus: online ? null : room?.CAMPUS || null,
      format: online ? 'online' : room?.NUMBER && room?.CAMPUS ? 'inPerson' : 'unknown',
      onlineUrl: null,
      subgroup: first('X-META-SUB_GROUP')?.value ?? null,
    });
  }
  return cards.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

async function get(url, mediaType, headers = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: mediaType, ...headers },
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Источник недоступен, перенаправляет запрос или не ответил за 15 секунд.');
  }
  if (!response.ok) throw new Error('Источник вернул HTTP ' + response.status + '.');
  if (!(response.headers.get('content-type') ?? '').toLowerCase().startsWith(mediaType)) {
    throw new Error('Тип ответа не совпадает с ожидаемым. Проверьте доступ к источнику.');
  }
  return response;
}

async function main() {
  const [, , input = '', week, ...extra] = process.argv;
  const group = normalize(input).toUpperCase();
  if (!/^[А-Я]{4,6}-\d{2}-\d{2}$/.test(group) || extra.length) {
    throw new Error('Использование: node scripts/schedule/probe.mjs ГРУППА [YYYY-MM-DD, понедельник МСК]');
  }
  const now = new Date(Date.now() + moscowOffset);
  const today = Date.parse(now.toISOString().slice(0, 10));
  const monday = today - ((now.getUTCDay() + 6) % 7) * day;
  const weekStart = week === undefined ? monday : Date.parse(week);
  if (week !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isFinite(weekStart)
      || new Date(weekStart).toISOString().slice(0, 10) !== week || new Date(weekStart).getUTCDay() !== 1)) {
    throw new Error('Дата недели должна быть понедельником в формате YYYY-MM-DD.');
  }

  const search = new URL('/schedule/api/search', origin);
  search.search = new URLSearchParams({ match: group, limit: '15' }).toString();
  const result = await (await get(search, 'application/json')).json().catch(() => null);
  if (!Array.isArray(result?.data)) throw new Error('Источник изменил формат результата поиска.');
  const matching = result.data.filter(item => item?.scheduleTarget === 1 && item.targetTitle === group);
  if (matching.length !== 1) throw new Error('Точное название группы отсутствует в выдаче или неоднозначно.');
  const [{ id, iCalLink }] = matching;
  let calendar;
  try {
    calendar = new URL(iCalLink, origin);
  } catch {
    throw new Error('Источник вернул некорректный адрес календаря.');
  }
  if (!Number.isSafeInteger(id) || id <= 0 || calendar.origin !== origin
      || calendar.username || calendar.password || calendar.pathname !== '/schedule/api/ical/1/' + id) {
    throw new Error('Адрес календаря вышел за пределы публичного API расписания групп.');
  }
  calendar.search = '?includeMeta=true';
  calendar.hash = '';
  await delay(600);
  const response = await get(calendar, 'text/calendar', { 'Client-Name': 'schedule-ui' });
  const cards = weekCards(await response.text(), weekStart);
  console.log(JSON.stringify(cards, null, 2));
}

main().catch(error => {
  console.error('Проба расписания: ' + error.message);
  process.exitCode = 1;
});
