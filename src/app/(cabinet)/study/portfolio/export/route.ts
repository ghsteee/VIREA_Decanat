import { portfolioStudent, portfolioEntries } from "@/server/portfolio";
import { portfolioPdf, portfolioZip } from "@/server/portfolio-export";
import { db } from "@/server/db";
import { hitRateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { studentId, userId } = await portfolioStudent();
  const format = new URL(request.url).searchParams.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "zip")
    return Response.json({ error: "Выбери PDF или ZIP." }, { status: 400 });
  const limit = await hitRateLimit(`portfolio-export:${userId}`, 20, 3600);
  if (!limit.allowed)
    return Response.json(
      { error: "Слишком много выгрузок. Попробуй позже." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSec),
          "Cache-Control": "no-store",
        },
      },
    );
  const [owner, entries] = await Promise.all([
    db.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        lastName: true,
        firstName: true,
        middleName: true,
        group: { select: { code: true, course: true } },
      },
    }),
    portfolioEntries(studentId),
  ]);
  try {
    const pdf = await portfolioPdf(owner, entries);
    const data = format === "zip" ? await portfolioZip(pdf, entries) : pdf;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type":
          format === "zip" ? "application/zip" : "application/pdf",
        "Content-Disposition": `attachment; filename="portfolio.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "Portfolio export failed",
      error instanceof Error ? error.name : "Error",
    );
    return Response.json(
      {
        error:
          "Не удалось собрать портфолио. Проверь доступность вложений и попробуй ещё раз.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
