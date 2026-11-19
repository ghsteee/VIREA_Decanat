import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

type PickupClient = Pick<Prisma.TransactionClient, "lesson" | "pickupSlot">;
export type PickupSlotOption = { id: string; label: string };

type SlotWindow = {
  startsAt: Date;
  endsAt: Date;
};
export function pickupLabel(slot: SlotWindow & { place: string }) {
  return `${dayMonth(mskDate(slot.startsAt))}, ${mskTime(slot.startsAt)}–${mskTime(slot.endsAt)} · ${slot.place}`;
}

function overlaps(a: SlotWindow, b: SlotWindow) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export async function listPickupSlots(
  instituteId: string,
  groupId: string,
): Promise<PickupSlotOption[]> {
  const now = new Date();
  const slots = await db.pickupSlot.findMany({
    where: {
      instituteId,
      startsAt: { gt: now, lt: new Date(now.getTime() + 14 * 86_400_000) },
      reservation: null,
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true, endsAt: true, place: true },
  });
  if (!slots.length) return [];
  const lessons = await db.lesson.findMany({
    where: {
      groupId,
      status: "scheduled",
      startsAt: {
        lt: slots.reduce(
          (latest, slot) => (slot.endsAt > latest ? slot.endsAt : latest),
          slots[0].endsAt,
        ),
      },
      endsAt: { gt: slots[0].startsAt },
    },
    select: { startsAt: true, endsAt: true },
  });
  return slots
    .filter((slot) => !lessons.some((lesson) => overlaps(slot, lesson)))
    .slice(0, 8)
    .map((slot) => ({ id: slot.id, label: pickupLabel(slot) }));
}

export async function pickupSlotAvailable(
  client: PickupClient,
  slotId: string,
  instituteId: string,
  groupId: string,
) {
  const now = new Date();
  const slot = await client.pickupSlot.findFirst({
    where: {
      id: slotId,
      instituteId,
      startsAt: { gt: now, lt: new Date(now.getTime() + 14 * 86_400_000) },
      reservation: null,
    },
    select: { startsAt: true, endsAt: true },
  });
  if (!slot) return false;
  return !(await client.lesson.findFirst({
    where: {
      groupId,
      status: "scheduled",
      startsAt: { lt: slot.endsAt },
      endsAt: { gt: slot.startsAt },
    },
    select: { id: true },
  }));
}
