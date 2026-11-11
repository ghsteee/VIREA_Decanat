import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/auth/guards";

export default async function Page() {
  await requireUser();
  return (
    <ComingSoon
      title="Заявки"
      text="Каталог справок и маршрут заявок появятся в задаче 4.10."
    />
  );
}
