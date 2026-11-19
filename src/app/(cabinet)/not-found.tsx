import Link from "next/link";
import { ConceptNote } from "@/components/concept-note";

export default function CabinetNotFound() {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 py-8">
      <h1 className="font-board text-3xl font-extrabold uppercase">
        Страница не найдена
      </h1>
      <Link href="/" className="flex min-h-11 items-center font-semibold">
        Вернуться в кабинет
      </Link>
      <ConceptNote />
    </main>
  );
}
