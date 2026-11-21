import Link from "next/link";
import {
  FolderOpen,
  Download,
  Trophy,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { portfolioStudent, portfolioEntries } from "@/server/portfolio";
import { PortfolioForm } from "@/components/portfolio/form";
import { AWARD_LABELS, PORTFOLIO_LABELS, fileSize } from "@/lib/portfolio";
import { dayMonth, mskDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; removed?: string }>;
}) {
  const { studentId } = await portfolioStudent();
  const [entries, sp] = await Promise.all([
    portfolioEntries(studentId),
    searchParams,
  ]);
  return (
    <main className="cabinet-page flex flex-col gap-5 p-4 md:p-6">
      <header className="rounded-2xl bg-board p-5 text-board-text md:p-6">
        <Link
          href="/study"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-board-link"
        >
          ← Учёба
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-board text-[34px] font-bold uppercase">
              Моё портфолио
            </h1>
            <p className="mt-2 text-sm text-board-muted">
              Твои проекты, участие в хакатонах и награды.
            </p>
          </div>
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <a
                href="/study/portfolio/export?format=pdf"
              download="portfolio.pdf"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-board-row px-4 py-3 font-semibold text-board-link no-underline"
              >
                <FileText size={18} aria-hidden />
                Скачать PDF
              </a>
              <a
                href="/study/portfolio/export?format=zip"
              download="portfolio.zip"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-board-row px-4 py-3 font-semibold text-board-link no-underline"
              >
                <Download size={18} aria-hidden />
                Скачать ZIP с файлами
              </a>
            </div>
          )}
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {(["work", "participation", "award"] as const).map((kind, i) => (
            <div key={kind} className="rounded-xl bg-board-row p-3">
              <dt className="text-xs text-board-muted">
                {["Работы", "Участие", "Награды"][i]}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {entries.filter((e) => e.kind === kind).length}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {(sp.done || sp.removed) && (
        <p role="status" className="rounded-xl bg-surface p-4 font-semibold">
          {sp.removed ? "Запись удалена." : "Портфолио обновлено."}
        </p>
      )}
      <details
        className="rounded-2xl border border-border bg-surface"
        open={!entries.length}
      >
        <summary className="min-h-11 cursor-pointer p-4 font-semibold">
          Добавить работу или достижение
        </summary>
        <div className="border-t border-border p-4 md:p-5">
          <PortfolioForm />
        </div>
      </details>
      {entries.length ? (
        <section
          aria-label="Записи портфолио"
          className="grid items-start gap-4 lg:grid-cols-2"
        >
          {entries.map((item) => (
            <article
              key={item.id}
              className="min-w-0 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                {item.kind === "award" ? (
                  <Trophy size={16} aria-hidden />
                ) : (
                  <FolderOpen size={16} aria-hidden />
                )}
                <span>
                  {item.kind === "award" && item.award
                    ? AWARD_LABELS[item.award]
                    : PORTFOLIO_LABELS[item.kind]}
                </span>
                {item.occurredOn && (
                  <time
                    className="ml-auto text-text-muted"
                    dateTime={mskDate(item.occurredOn)}
                  >
                    {dayMonth(mskDate(item.occurredOn))}.
                    {item.occurredOn.getUTCFullYear()}
                  </time>
                )}
              </div>
              <h2 className="break-words text-lg font-semibold leading-6">
                {item.title}
              </h2>
              {item.eventName && (
                <p className="mt-1 break-words text-sm font-semibold text-text-muted">
                  {item.eventName}
                </p>
              )}
              {item.description && (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {item.description}
                </p>
              )}
              {item.projectUrl && (
                <a
                  href={item.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                >
                  Открыть работу <ArrowUpRight size={16} aria-hidden />
                </a>
              )}
              {!!item.attachments.length && (
                <ul className="mt-3 divide-y divide-border border-t border-border">
                  {item.attachments.map((file) => (
                    <li key={file.id}>
                      <a
                        href={`/study/portfolio/files/${file.id}`}
                        className="flex min-h-11 items-center gap-2 py-2 text-sm text-primary"
                      >
                        <Download size={16} aria-hidden className="shrink-0" />
                        <span className="min-w-0 break-all">{file.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-text-muted">
                          {fileSize(file.bytes)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/study/portfolio/${item.id}`}
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary"
              >
                Редактировать →
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <p className="rounded-2xl bg-surface p-5 text-text-muted">
          Добавь первую работу, сертификат участия или награду. Затем сможешь
          скачать PDF и архив со всеми вложениями.
        </p>
      )}
      <p className="text-xs text-text-muted">
        Записи и документы добавляешь ты. PDF содержит описание портфолио, ZIP —
        PDF и прикреплённые файлы.
      </p>
    </main>
  );
}
