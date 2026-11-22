import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ConceptNote } from "@/components/concept-note";
import { CabinetNav } from "@/components/nav/cabinet-nav";

// Оболочка кабинета (задача 3.8): навигация, отступы под капсулу и панель.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  const group = user.groupId
    ? await db.group.findUnique({
        where: { id: user.groupId },
        select: {
          code: true,
          course: true,
          institute: { select: { code: true } },
        },
      })
    : null;
  return (
    <div className="flex min-h-dvh flex-col">
      <a className="skip-link" href="#cabinet-content">
        К содержанию
      </a>
      <CabinetNav
        account={{
          name: user.displayName,
          role: user.role,
          head: user.isGroupHead,
          group,
        }}
      />
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
