"""Разбор ответов опроса «Каким должен быть цифровой деканат МИРЭА?».

Запуск: python3 -I analyze_survey.py <answers.json> <out_dir>
Файл — выгрузка Яндекс Форм: список ответов, каждый ответ — список пар [колонка, значение].
"""
import json
import sys
import csv
from collections import Counter, OrderedDict
from statistics import mean, median

src, out_dir = sys.argv[1], sys.argv[2]
raw = json.load(open(src, encoding="utf-8"))
rows = [OrderedDict(r) for r in raw]
N = len(rows)
cols = list(rows[0].keys())

report = {"N": N, "single": {}, "multi": {}, "matrix": {}, "text": {}, "other_cols": []}


def qnum(c):
    head = c.split(".", 1)[0]
    return int(head) if head.isdigit() else None


groups = OrderedDict()
for c in cols:
    if c == "ID":
        continue
    if " / " in c:
        q, opt = c.split(" / ", 1)
        groups.setdefault(q, []).append((c, opt))
    else:
        groups.setdefault(c, None)

for q, opts in groups.items():
    n = qnum(q)
    if opts is None:
        vals = [r.get(q, "") for r in rows]
        nonempty = [v for v in vals if str(v).strip()]
        if n in (13, 14, 20):
            report["text"][q] = nonempty
        elif n is None:
            report["other_cols"].append((q, Counter(nonempty).most_common(5)))
        else:
            report["single"][q] = Counter(nonempty).most_common()
    else:
        if n in (11, 17):
            m = OrderedDict()
            for c, opt in opts:
                vals = [r.get(c, "") for r in rows if str(r.get(c, "")).strip()]
                m[opt] = vals
            report["matrix"][q] = m
        else:
            cnt = Counter()
            answered = 0
            for r in rows:
                any_ = False
                for c, opt in opts:
                    if str(r.get(c, "")).strip():
                        cnt[opt] += 1
                        any_ = True
                answered += any_
            report["multi"][q] = (answered, cnt.most_common())


def pct(k, base):
    return f"{k} ({round(100 * k / base)}%)" if base else str(k)


lines = [f"Всего ответов: {N}", ""]
for q, c in report["single"].items():
    lines.append(f"## {q}")
    for v, k in c:
        lines.append(f"  {v}: {pct(k, N)}")
    lines.append("")
for q, (ans, c) in report["multi"].items():
    lines.append(f"## {q}  [ответили {ans}]")
    for v, k in c:
        lines.append(f"  {v}: {pct(k, N)}")
    lines.append("")
for q, m in report["matrix"].items():
    lines.append(f"## {q}")
    for row, vals in m.items():
        nums = [int(v) for v in vals if str(v).isdigit()]
        if nums:
            low = sum(1 for x in nums if x <= 2)
            lines.append(f"  {row}: среднее {mean(nums):.2f}, медиана {median(nums)}, оценок 1–2: {pct(low, len(nums))}, n={len(nums)}")
        else:
            cnt = Counter(vals)
            lines.append(f"  {row}: " + ", ".join(f"{k}: {v}" for k, v in cnt.most_common()) + f", n={len(vals)}")
    lines.append("")
for q, vals in report["text"].items():
    lines.append(f"## {q}  [ответов {len(vals)}]")
    for v in vals:
        lines.append(f"  - {v}")
    lines.append("")
if report["other_cols"]:
    lines.append("## Служебные колонки")
    for q, c in report["other_cols"]:
        lines.append(f"  {q}: {c}")

open(f"{out_dir}/survey_report.txt", "w", encoding="utf-8").write("\n".join(lines))

# Плоская таблица для проверки и для PDF
with open(f"{out_dir}/answers_flat.csv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(cols)
    for r in rows:
        w.writerow([r.get(c, "") for c in cols])

print("\n".join(lines))
