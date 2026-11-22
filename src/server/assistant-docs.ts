import "server-only";
import { db } from "@/server/db";

export async function assistantRules() {
  return db.helpDocument.findFirst({
    where: {
      source: "docs/knowledge/polozhenie-demo.md",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      title: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        take: 60,
        select: { number: true, heading: true, text: true },
      },
    },
  });
}
