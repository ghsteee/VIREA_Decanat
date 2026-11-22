# Подключение GigaChat к «Деканычу»

В [личном кабинете GigaChat API](https://developers.sber.ru/docs/ru/gigachat/individuals-quickstart) создай проект и возьми готовый ключ авторизации. Для проекта физлица используется `GIGACHAT_API_PERS`. Затем положи пакет сертификатов на VPS по [инструкции](../../deploy/certs/README.md).

На VPS открой `sudoedit /opt/dekanych/.env`. Укажи настройки один раз. Готовый ключ вставь в файл сразу после знака `=`.

```dotenv
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat-2-Pro
GIGACHAT_CA_BUNDLE=/certs/russian_trusted_ca.pem
```

Чтобы проверить подключение **до включения помощника**, запусти следующий блок в SSH-терминале. Он берёт проверку из ветки PR №61 и запускает её в одноразовом контейнере с настройками VPS.

```bash
sudo -H bash <<'CHECK'
set -euo pipefail
cd /opt/dekanych
git fetch origin refs/heads/feat/ai1-demo-assistant
git show FETCH_HEAD:scripts/gigachat/check.mjs |
  docker compose run -T --rm --no-deps --entrypoint node app --input-type=module
CHECK
```

При успехе вывод содержит `OAuth: OK` и `Доступ к выбранной модели: OK`. Проверка обращается к OAuth и списку моделей. Она не печатает токены и не отправляет запрос на генерацию.

- `сертификаты: ENOENT` — файл отсутствует по пути, который видит контейнер.
- `OAuth: HTTP_401` — проверь ключ авторизации, проект и тип доступа.
- `MODEL_NOT_AVAILABLE` — выбери точное имя из списка моделей, который показала проверка.
- `ENOTFOUND`, `ECONNREFUSED` или `ABORT_ERR` — проверь сеть VPS и подключение к OAuth на порту 9443.
- Ошибка проверки цепочки сертификатов — обнови пакет Минцифры и проверь путь. TLS остаётся включённым.

После проверки и слияния PR установи `AI_ASSISTANT_ENABLED=on` в `.env` перед обновлением приложения. Проверь из профиля студента, что на вопрос «Сколько баллов нужно для допуска?» помощник возвращает действующий пункт демо-положения. Затем проверь черновик справки и убедись, что он требует явной отправки студентом.
