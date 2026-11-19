"use server";

import { requireStaff } from "@/server/auth/guards";
import {
  publishPostFor,
  updateLessonFor,
  type FormState,
} from "@/server/publications";

export async function updateLesson(_previous: FormState, form: FormData) {
  const user = await requireStaff();
  return updateLessonFor({ id: user.id, role: "staff" }, form);
}

export async function publishPost(_previous: FormState, form: FormData) {
  const user = await requireStaff();
  return publishPostFor({ id: user.id, role: "staff" }, form);
}
