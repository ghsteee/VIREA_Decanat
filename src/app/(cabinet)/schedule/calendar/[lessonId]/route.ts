import { getCurrentUser } from "@/server/auth/session";
import { lessonCalendar } from "@/server/lesson-calendar";
import { getCalendarLesson } from "@/server/queries/schedule";

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  if (user?.role !== "student" || !user.groupId || !uuid.test(lessonId)) {
    return new Response(null, { status: 404, headers: noStore });
  }

  const lesson = await getCalendarLesson(user.groupId, lessonId);
  if (!lesson) return new Response(null, { status: 404, headers: noStore });

  return new Response(lessonCalendar(lesson), {
    headers: {
      ...noStore,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dekanych-lesson.ics"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
