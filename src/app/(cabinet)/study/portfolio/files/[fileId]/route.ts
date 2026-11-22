import { notFound } from "next/navigation";
import { portfolioStudent, readPortfolioFile } from "@/server/portfolio";
import { db } from "@/server/db";
import { UUID } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { studentId } = await portfolioStudent();
  const { fileId } = await params;
  if (!UUID.test(fileId)) notFound();
  const file = await db.portfolioAttachment.findFirst({
    where: { id: fileId, item: { studentId } },
  });
  if (!file) notFound();
  try {
    const data = await readPortfolioFile(file.storageKey);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Файл временно недоступен. Попробуй позже." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
