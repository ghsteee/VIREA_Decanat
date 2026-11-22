import { requireUser } from "@/server/auth/guards";
import { CabinetNav } from "@/components/nav/cabinet-nav";
import { CabinetHeader } from "@/components/nav/cabinet-header";

// Оболочка кабинета (задача 3.8): навигация, отступы под капсулу и панель.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="cabinet-shell flex min-h-dvh flex-col">
      <a className="skip-link" href="#cabinet-content">
        К содержанию
      </a>
      <CabinetNav role={user.role} />
      <CabinetHeader role={user.role} />
      <div
        id="cabinet-content"
        className="flex min-w-0 flex-1 flex-col"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
