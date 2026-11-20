import { requireUser } from "@/server/auth/guards";
import { ConceptNote } from "@/components/concept-note";
import { CabinetNav } from "@/components/nav/cabinet-nav";

// Оболочка кабинета (задача 3.8): навигация, отступы под капсулу и панель.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="cabinet-shell flex min-h-dvh flex-col pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
      <a className="skip-link" href="#cabinet-content">
        К содержанию
      </a>
      <CabinetNav role={user.role} />
      <div
        id="cabinet-content"
        className="flex min-w-0 flex-1 flex-col"
        tabIndex={-1}
      >
        {children}
      </div>
      <footer className="cabinet-page cabinet-footer">
        <ConceptNote />
      </footer>
    </div>
  );
}
