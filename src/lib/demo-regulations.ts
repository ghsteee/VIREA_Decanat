export const DEMO_REGULATIONS_PATH = "docs/knowledge/polozhenie-demo.md";
export const DEMO_REGULATIONS_VERSION = "1.1";

/** Разбор демо-положения на пункты для помощника (AI1). */
export function parseRegulations(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const sections: { number: string; heading: string; text: string }[] = [];
  let heading = "";
  let current: { number: string; heading: string; lines: string[] } | null =
    null;
  const flush = () => {
    if (current) {
      sections.push({
        number: current.number,
        heading: current.heading,
        text: current.lines.join("\n").trim(),
      });
    }
    current = null;
  };
  for (const line of lines) {
    const h = line.match(/^## (\d+)\. (.+)$/);
    if (h) {
      flush();
      heading = h[2];
      continue;
    }
    const p = line.match(/^(\d+\.\d+)\. (.*)$/);
    if (p) {
      flush();
      current = { number: p[1], heading, lines: [p[2]] };
      continue;
    }
    if (current && !line.startsWith("#") && !line.startsWith(">")) {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}
