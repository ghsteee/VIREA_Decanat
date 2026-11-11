import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/auth/guards";

export default async function Page() {
  await requireUser();
  return (
    <ComingSoon
      title="Уведомления"
      text="Лента уведомлений появится в задаче 4.5."
    />
  );
}
