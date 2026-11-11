import { ComingSoon } from "@/components/coming-soon";
import { requireStaff } from "@/server/auth/guards";

export default async function Page() {
  await requireStaff();
  return (
    <ComingSoon
      title="Объявления"
      text="Дедлайны и объявления для групп появятся в задаче 4.4."
    />
  );
}
