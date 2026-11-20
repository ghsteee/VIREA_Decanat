import { requireUser } from "@/server/auth/guards";
import { CabinetNav } from "@/components/nav/cabinet-nav";
import { PushSync } from "@/components/push-sync";

// Оболочка кабинета (задача 3.8): навигация, отступы под капсулу и панель.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh pb-[88px] lg:pb-0 lg:pl-[92px]">
      <PushSync key={user.id} />
      {children}
      <CabinetNav role={user.role} />
    </div>
  );
}
