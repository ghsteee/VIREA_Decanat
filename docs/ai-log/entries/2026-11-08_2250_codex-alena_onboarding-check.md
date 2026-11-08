# Проверка онбординга Codex Алёны

- **Дата и время:** 2026-11-08 22:50 МСК
- **Инструмент:** Codex (Алёна)
- **Кто ставил задачу:** Алёна
- **Этап плана:** 1 Исследование
- **Требования PRD:** —

## Задача

Проверить, можно ли подключиться к проекту без истории чата. Прочитать пять документов по порядку, пересказать идею и правила, выбрать первую задачу и зафиксировать пробелы.

> Ничего не меняй в документах и коде. Единственное исключение — добавь запись в журнал ИИ о своём подключении.

## Что сделал ИИ

- Прочитал в указанном порядке `AGENTS.md`, `docs/context.md`, `docs/status.md`, `docs/PRD.md` и `docs/hackathon-task.md` в `docs/agent-onboarding`. Три документа по онбордингу пока доступны только в этой ветке. В `main` отсутствуют `docs/context.md`, `docs/status.md` и `docs/hackathon-task.md`. [AGENTS.md:13-22](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/AGENTS.md#L13-L22)
- Сформулировал идею прототипа: кабинет студента вымышленного ВТУ ВИРЭА первым сообщает о переносах пар и новых дедлайнах через web push и MAX с целевым временем доставки до минуты. Сверил ограничения по вымышленным данным, символике, серверной авторизации, паролям, секретам и доступности из РФ. [docs/PRD.md:3](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L3) · [AGENTS.md:33-44](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/AGENTS.md#L33-L44)
- Выбрал проверку подключения Codex Алёны. Алёна поручила её в текущем чате, а результат можно проверить по PR с этой записью. Следующие задачи исследования и дизайна уже распределены. [docs/status.md:27-43](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/status.md#L27-L43) · [docs/setup/connect-agents.md:23-27](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/setup/connect-agents.md#L23-L27)
- Нашёл расхождения в процессе. Правила называют `main` защищённой, статус говорит обратное. GitHub подтвердил `protected: false`. Инструкция называет напарника collaborator, а статус оставляет выдачу доступа открытой. [AGENTS.md:49](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/AGENTS.md#L49) · [docs/status.md:11](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/status.md#L11) · [docs/status.md:29-30](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/status.md#L29-L30) · [docs/setup/connect-agents.md:3](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/setup/connect-agents.md#L3)
- Для проверочного PR требования PRD нет. Запрошенные точный заголовок и один файл журнала расходятся с общим требованием указать номер PRD и обновить статус. В инструкции подключения также остались прежние заголовок и имя записи. Выполнил явное поручение для этого PR. [AGENTS.md:24](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/AGENTS.md#L24) · [AGENTS.md:49-50](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/AGENTS.md#L49-L50) · [docs/status.md:5](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/status.md#L5) · [docs/setup/connect-agents.md:23-27](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/setup/connect-agents.md#L23-L27)
- Нужно уточнить критерии к 16 ноября. S1 требует видеть изменения над ближайшей парой, а T1 ставит пару первой. Этаж нужен в S1, но R4 с этажом имеет приоритет Should. Демо-кнопка нужна в S3, но E4 имеет приоритет Should. В S4 нужны PDF или слот выдачи, а способ получения A3 — Should, PDF с QR A5 — Could. [docs/PRD.md:24-31](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L24-L31) · [docs/PRD.md:44-49](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L44-L49) · [docs/PRD.md:62-66](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L62-L66) · [docs/PRD.md:73](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L73)
- Условие ссылается на «эту страницу» и Регламент без URL. Для сверки сдачи нужен адрес источника. Путь `public/brand/` пока отсутствует и понадобится при добавлении ассетов. [docs/hackathon-task.md:62-68](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/hackathon-task.md#L62-L68) · [docs/hackathon-task.md:85-87](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/hackathon-task.md#L85-L87) · [docs/brand/README.md:3](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/brand/README.md#L3)
- Для старта каркаса ещё нужны модель данных и дизайн-система. Оба файла пока описывают, что предстоит заполнить. Выбор шкалы оценок, источника документов для помощника, ИИ-провайдера и проверка MAX уже обозначены как открытые вопросы. [docs/status.md:9-10](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/status.md#L9-L10) · [docs/data-model.md:3-7](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/data-model.md#L3-L7) · [docs/design-system.md:3-5](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/design-system.md#L3-L5) · [docs/PRD.md:139-145](https://github.com/ghsteee/VIREA_Decanat/blob/9505ff8253e35384ee496a90477035d53ce27a55/docs/PRD.md#L139-L145)

## Что проверил и поправил человек

Запись ожидает ревью напарника.

## Ошибки ИИ

Не было.

## Скриншоты

Проверка касалась документации. Экраны приложения не проверялись.
