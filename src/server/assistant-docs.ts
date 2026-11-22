import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEMO_REGULATIONS_PATH,
  DEMO_REGULATIONS_VERSION,
  parseRegulations,
} from "@/lib/demo-regulations";

export async function assistantRules() {
  const sections = parseRegulations(
    await readFile(join(process.cwd(), DEMO_REGULATIONS_PATH), "utf8"),
  );
  return {
    title: "Положение об учёбе и услугах дирекции ВТУ ВИРЭА",
    version: DEMO_REGULATIONS_VERSION,
    sections,
  };
}
