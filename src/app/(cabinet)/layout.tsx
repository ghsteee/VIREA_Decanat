import { requireUser } from "@/server/auth/guards";
import { CabinetNav } from "@/components/nav/cabinet-nav";

// Оболочка кабинета (задача 3.8): навигация, отступы под капсулу и панель.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-[92px]">
      {children}
      <CabinetNav role={user.role} />
    </div>
  );
}
