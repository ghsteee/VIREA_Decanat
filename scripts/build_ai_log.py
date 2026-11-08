"""Собирает журнал работы с ИИ из docs/ai-log/entries/*.md в docs/ai-log/LOG.md.

Запуск из корня репозитория: python3 scripts/build_ai_log.py
Записи сортируются по имени файла (дата_время_кто_кратко). Пункты из разделов
«Ошибки ИИ» собираются в сводную таблицу в конце.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
ENTRIES = ROOT / "docs" / "ai-log" / "entries"
OUT = ROOT / "docs" / "ai-log" / "LOG.md"

WHO = {
    "claude": "Claude Code",
    "codex-alena": "Codex (Алёна)",
    "codex-partner": "Codex (напарник)",
    "chatgpt": "ChatGPT",
}


def section(text: str, title: str) -> str:
    m = re.search(rf"^## {re.escape(title)}\s*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def main() -> None:
    files = sorted(p for p in ENTRIES.glob("*.md"))
    rows, errors, bodies = [], [], []
    for i, f in enumerate(files, 1):
        text = f.read_text(encoding="utf-8")
        parts = f.stem.split("_", 3)
        date = parts[0] if parts else ""
        who = WHO.get(parts[2], parts[2]) if len(parts) > 2 else ""
        title_m = re.search(r"^# (.+)$", text, re.M)
        title = title_m.group(1).strip() if title_m else f.stem
        rows.append(f"| {i} | {date} | {who} | {title} |")
        for line in section(text, "Ошибки ИИ").splitlines():
            line = line.strip()
            if line.startswith(("- ", "* ")) and "не было" not in line.lower():
                errors.append(f"| {i} | {who} | {line[2:].replace('|', '/')} |")
        # Пути к скриншотам в записях даны относительно entries/, в LOG.md — относительно ai-log/
        body = text.replace("](../screenshots/", "](screenshots/")
        body = re.sub(r"^# ", f"## {i}. ", body, count=1, flags=re.M)
        body = re.sub(r"^## (?!\d+\. )", "### ", body, flags=re.M)
        bodies.append(body.strip())

    out = [
        "# Журнал работы с ИИ — цифровой деканат ВТУ ВИРЭА",
        "",
        "Файл собран скриптом `scripts/build_ai_log.py`, руками не редактировать. Записи — в `entries/`.",
        "",
        "## Сводка",
        "",
        "| № | Дата | Инструмент | Что сделано |",
        "| --- | --- | --- | --- |",
        *rows,
        "",
        "## Ошибки ИИ",
        "",
        "| Запись | Инструмент | Ошибка → как заметили → как исправили → правило |",
        "| --- | --- | --- |",
        *(errors or ["| — | — | Пока нет |"]),
        "",
        "## Записи",
        "",
        "\n\n---\n\n".join(bodies),
        "",
    ]
    OUT.write_text("\n".join(out), encoding="utf-8")
    print(f"{len(files)} записей, {len(errors)} ошибок → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
