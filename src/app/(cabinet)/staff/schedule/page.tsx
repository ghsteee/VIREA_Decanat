import { ComingSoon } from "@/components/coming-soon";
import { requireStaff } from "@/server/auth/guards";

export default async function Page() {
  await requireStaff();
  return (
    <ComingSoon
      title="Перенос пары"
      text="Перенос, отмена и смена аудитории появятся в задаче 4.4."
    />
  );
}
