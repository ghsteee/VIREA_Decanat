"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";

/** Тема интерфейса — в настройках пользователя из сессии. */
export async function setTheme(form: FormData) {
  const user = await requireUser();
  const value = String(form.get("theme"));
  const theme = value === "light" || value === "dark" ? value : "system";
  await db.userPreferences.upsert({
    where: { userId: user.id },
    create: { userId: user.id, theme },
    update: { theme },
  });
  revalidatePath("/", "layout");
}
