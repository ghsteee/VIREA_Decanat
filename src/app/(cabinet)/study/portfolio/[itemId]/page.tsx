import Link from "next/link";
import { portfolioStudent, ownPortfolioItem } from "@/server/portfolio";
import {
  PortfolioForm,
  DeletePortfolioForm,
} from "@/components/portfolio/form";
import { mskDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { studentId } = await portfolioStudent();
  const item = await ownPortfolioItem(studentId, (await params).itemId);
  return (
    <main className="cabinet-page mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Link
        href="/study/portfolio"
        className="inline-flex min-h-11 items-center font-semibold text-primary"
      >
        ← Моё портфолио
      </Link>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h1 className="mb-5 font-board text-[30px] font-bold uppercase">
          Редактировать запись
        </h1>
        <PortfolioForm
          initial={{
            id: item.id,
            kind: item.kind,
            award: item.award,
            title: item.title,
            eventName: item.eventName,
            description: item.description,
            date: item.occurredOn ? mskDate(item.occurredOn) : "",
            projectUrl: item.projectUrl,
          }}
        />
      </section>
      {!!item.attachments.length && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Приложенные файлы</h2>
          <ul className="divide-y divide-border">
            {item.attachments.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <a
                  href={`/study/portfolio/files/${file.id}`}
                  className="min-w-0 break-all text-sm text-primary"
                >
                  {file.name}
                </a>
                <DeletePortfolioForm id={file.id} file />
              </li>
            ))}
          </ul>
        </section>
      )}
      <DeletePortfolioForm id={item.id} />
    </main>
  );
}
