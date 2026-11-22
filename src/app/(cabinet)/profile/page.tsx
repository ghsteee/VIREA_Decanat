import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { logout } from "@/app/login/actions";
import { ThemeSwitch } from "@/components/nav/theme-switch";
import { db } from "@/server/db";
import { Flaps } from "@/components/board/flaps";
import { PushToggle } from "@/components/push-toggle";
import { vapidPublicKey } from "@/server/push";
import { EmailSettings } from "@/components/email-settings";
import { assistantEnabled } from "@/server/gigachat";
import { emailConfigured } from "@/server/email";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, prefs, email] = await Promise.all([
    user.studentProfileId
      ? db.studentProfile.findUnique({
          where: { id: user.studentProfileId },
          include: { group: { include: { institute: true } } },
        })
      : null,
    db.userPreferences.findUnique({ where: { userId: user.id } }),
    user.studentProfileId
      ? db.emailSubscription.findFirst({
          where: { userId: user.id, revokedAt: null },
          select: { id: true, verifiedAt: true },
        })
      : null,
  ]);
  const theme = prefs?.theme ?? "system";

  return (
    <main className="cabinet-page cabinet-columns flex flex-col lg:grid lg:grid-cols-2 lg:gap-6">
      <section className="flex min-w-0 flex-col gap-3.5 bg-board px-3.5 pb-4 pt-4 text-board-text md:rounded-3xl md:p-6">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]">
          Профиль
        </h1>
        {profile ? (
          <article
            aria-label="Студенческий билет"
            className="relative flex flex-col gap-3 rounded-[10px] bg-board-row p-3.5"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                Студенческий · ВТУ ВИРЭА
              </span>
              <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-ok">
                действует
              </span>
            </div>
            <p className="m-0 font-board text-[26px] font-extrabold uppercase leading-7 tracking-[0.03em]">
              {profile.lastName}
              <br />
              {profile.firstName} {profile.middleName}
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                Группа
              </span>
              <Flaps value={profile.group.code} size="md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                  Номер
                </span>
                <Flaps value={profile.studentCardNo} size="md" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                  Институт
                </span>
                <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em]">
                  {profile.group.institute.code} · {profile.group.course} курс
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                Форма
              </span>
              <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em]">
                {profile.studyForm === "full_time" ? "очная" : "заочная"} ·{" "}
                {profile.funding === "budget" ? "бюджет" : "договор"}
                {user.isGroupHead ? " · староста" : ""}
              </span>
            </div>
          </article>
        ) : (
          <p className="m-0 text-[15px] text-board-muted">
            Сотрудник дирекции · вход {user.displayName}
          </p>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-5 px-4 py-4 md:mt-5 md:rounded-3xl md:bg-surface md:p-6 lg:mt-0">
        {user.isGroupHead ? (
          <Link
            href="/group-head"
            className="flex min-h-11 items-center justify-between rounded-xl bg-action px-3 font-semibold text-on-action no-underline"
          >
            Кабинет старосты <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
        {user.studentProfileId && assistantEnabled() ? (
          <Link
            href="/assistant"
            className="flex min-h-11 items-center justify-between rounded-xl border border-border-strong px-3 font-semibold text-text no-underline"
          >
            ИИ-помощник <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
        <section aria-labelledby="ntf" className="flex flex-col gap-1">
          <h2
            id="ntf"
            className="m-0 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
          >
            Уведомления
          </h2>
          <PushToggle publicKey={vapidPublicKey()} />
          {profile && (
            <EmailSettings
              available={emailConfigured()}
              subscription={
                email && {
                  id: email.id,
                  verified: Boolean(email.verifiedAt),
                }
              }
            />
          )}
        </section>

        <section aria-labelledby="thm">
          <h2
            id="thm"
            className="m-0 mb-2 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
          >
            Тема
          </h2>
          <ThemeSwitch theme={theme} />
        </section>

        <form action={logout}>
          <button
            type="submit"
            className="h-12 w-full rounded-xl border border-border-strong bg-surface font-semibold text-danger-text"
          >
            Выйти
          </button>
        </form>
      </div>
    </main>
  );
}
