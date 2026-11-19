"use server";

import { requireGroupHead } from "@/server/auth/guards";
import {
  publishPostFor,
  updateLessonFor,
  type FormState,
} from "@/server/publications";

export async function updateGroupLesson(_previous: FormState, form: FormData) {
  return updateLessonFor(await requireGroupHead(), form);
}

export async function publishToGroup(_previous: FormState, form: FormData) {
  return publishPostFor(await requireGroupHead(), form);
}
