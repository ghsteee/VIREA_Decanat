import Link from "next/link";

export default function CabinetNotFound() {
  return (
    <main className="cabinet-page cabinet-focus flex flex-col gap-4 px-4 py-8 md:rounded-3xl">
      <h1 className="font-board text-3xl font-extrabold uppercase">
        Страница не найдена
      </h1>
      <Link href="/" className="flex min-h-11 items-center font-semibold">
        Вернуться в кабинет
      </Link>
    </main>
  );
}
