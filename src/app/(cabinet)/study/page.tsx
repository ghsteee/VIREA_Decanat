import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/auth/guards";

export default async function Page() {
  await requireUser();
  return (
    <ComingSoon
      title="Учёба"
      text="Оценки, сводка и допуск к сессии появятся в задаче 4.9."
    />
  );
}
