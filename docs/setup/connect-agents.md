# Как подключить Codex ×2 и ChatGPT к репозиторию

Репозиторий: https://github.com/ghsteee/VIREA_Decanat (приватный). Владелец — Алёна. Напарник получает права collaborator (Write) на шаге 0 — пока это не сделано, см. `docs/status.md`.

## 0. Один раз — Алёна

1. GitHub → репозиторий → **Settings → Collaborators → Add people** → логин напарника → роль **Write**. Напарник принимает приглашение из почты.
2. **Settings → Branches → Add branch ruleset** (или Branch protection rule) для `main`: «Require a pull request before merging», 1 approval. Так ни один агент не запушит прямо в `main`.

## 1. Codex — у каждого из своего аккаунта ChatGPT

Делают оба, каждый у себя. Codex работает в облаке ChatGPT и сам читает `AGENTS.md`.

1. Открыть **chatgpt.com/codex** и войти своим аккаунтом ChatGPT.
2. **Connect GitHub** (или Settings → Connectors / Plugins → GitHub). Откроется страница приложения **ChatGPT Codex Connector** на GitHub.
3. Install → выбрать **Only select repositories** → `VIREA_Decanat`.
   - Алёна ставит приложение на свой аккаунт сама.
   - Напарник: если GitHub попросит одобрение владельца — Алёне придёт запрос, его нужно принять (Settings → Applications / GitHub Apps → Pending requests).
4. В Codex: **Settings → Environments → New environment** → репозиторий `VIREA_Decanat`.
   - Setup script пока пустой. Когда появится код: `npm ci`.
   - Internet access: включить для установки пакетов (npm registry).
   - Секреты в environment не добавлять, пока нет тестовой БД. Боевые ключи — только на VPS.
5. Первая задача для проверки — промпт «Если агент начинает с нуля» из `docs/prompts.md`. Агент пересказывает проект, правила и свою первую задачу, перечисляет пробелы в документах, добавляет запись журнала `docs/ai-log/entries/<дата>_<время>_<codex-alena или codex-partner>_onboarding-check.md` и открывает PR `docs: проверка онбординга <Codex Алёны / Codex напарника>`.

   Если пересказ верный и запись оформлена по шаблону — Codex подключён и правила видит. Найденные пробелы закрываем отдельным PR.

**Как давать задачи Codex дальше:** одна задача — одна ветка — один PR. В тексте задачи указывать номер требования из PRD («сделай R3 по docs/PRD.md»). В конце Codex сам добавляет запись в журнал — это прописано в `AGENTS.md`, напоминать не нужно, но проверять в PR надо.

## 2. ChatGPT — логотип и картинки

ChatGPT (обычный чат, не Codex) генерирует картинки. Доступ к репозиторию нужен, чтобы он читал PRD, дизайн-систему и журнал.

1. chatgpt.com → **Settings → Apps (Connectors) → GitHub → Connect** → выбрать `VIREA_Decanat`. Это то же приложение GitHub, что у Codex, — если уже установлено, достаточно подтвердить.
2. Создать в ChatGPT проект «ВТУ ВИРЭА» и вставить в инструкции проекта:

   > Ты делаешь картинки для прототипа «Цифровой деканат ВТУ ВИРЭА». Перед работой прочитай в репозитории ghsteee/VIREA_Decanat файлы AGENTS.md, docs/brand/README.md и docs/design-system.md. ВТУ ВИРЭА — вымышленный вуз: не копируй герб, логотип и фирменный стиль РТУ МИРЭА, не рисуй реальных людей. После каждой картинки дай текст записи для журнала ИИ по шаблону docs/ai-log/_template.md (инструмент ChatGPT, промпт, выбранный вариант).

3. ChatGPT через GitHub только **читает** репозиторий. Готовые картинки в репозиторий кладём так:
   - скачать PNG/SVG → GitHub → `docs/brand/` → **Add file → Upload files** → «Create a new branch» → PR; или
   - передать файл Codex: «положи logo.svg в docs/brand/ и public/brand/, добавь запись журнала с <кто>=chatgpt».
4. Текст записи журнала, который выдал ChatGPT, сохраняется в `docs/ai-log/entries/ГГГГ-ММ-ДД_ЧЧММ_chatgpt_<кратко>.md` в том же PR.

## 3. Claude Code (Алёна)

Подключён 8 ноября: claude.ai → Settings → Connectors → GitHub, плюс приложение **Claude** установлено на GitHub (github.com/settings/installations) с доступом к `VIREA_Decanat`. Важно: одной авторизации приложения (вкладка Authorized GitHub Apps) мало — без установки (Installed GitHub Apps) Claude не видит репозиторий.

## Проверка, что всё подключено

- [ ] Напарник видит репозиторий и может создать ветку
- [ ] Codex Алёны открыл PR с записью журнала (Codex подключён 8 ноября, проверочный PR ещё не открыт)
- [ ] Codex напарника открыл PR с записью журнала
- [ ] ChatGPT отвечает на «Перескажи правила из AGENTS.md про картинки»
- [ ] Прямой push в `main` запрещён
