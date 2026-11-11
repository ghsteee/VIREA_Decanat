# Сертификаты НУЦ Минцифры для GigaChat

Серверы GigaChat (`ngw.devices.sberbank.ru`, `api.giga.chat`) используют сертификаты Национального удостоверяющего центра Минцифры. Чтобы приложение их принимало, на сервере в этой папке должен лежать файл `russian_trusted_ca.pem` — корневой и выпускающий сертификаты подряд.

Файл используется **только клиентом GigaChat** (`GIGACHAT_CA_BUNDLE=/certs/russian_trusted_ca.pem` в `.env`), а не всем приложением. Проверку сертификатов (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `curl -k`) не отключаем, даже если так написано в примерах.

В репозиторий файлы сертификатов не коммитим (`.gitignore` в этой папке).

## Как получить (на сервере)

Источник — [портал Госуслуг, раздел «Сертификаты»](https://www.gosuslugi.ru/crt), ссылки на файлы для Linux; те же адреса приводит [документация GigaChat](https://developers.sber.ru/docs/ru/gigachat/certificates).

```bash
cd /opt/dekanych/deploy/certs
sudo curl -fsSL -o root.crt https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt
sudo curl -fsSL -o sub.crt https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt
```

Проверить, что это нужные сертификаты (владелец — Минцифры, срок действия):

```bash
for f in root.crt sub.crt; do openssl x509 -in $f -noout -subject -issuer -enddate; done
```

Ожидается `CN = Russian Trusted Root CA` и `CN = Russian Trusted Sub CA`, `O = The Ministry of Digital Development and Communications`.

Собрать в один файл и проверить соединение с GigaChat:

```bash
sudo sh -c 'cat root.crt sub.crt > russian_trusted_ca.pem' && sudo chmod 644 russian_trusted_ca.pem
curl -sS --cacert russian_trusted_ca.pem -o /dev/null -w "%{http_code}\n" https://api.giga.chat/v1/models
```

Ответ `401` — TLS прошёл (нет токена, это нормально). Ошибка сертификата — файлы скачались не те.
