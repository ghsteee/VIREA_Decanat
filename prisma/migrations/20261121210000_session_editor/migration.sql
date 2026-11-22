ALTER TABLE "Assessment"
  ADD COLUMN "sessionStartsAt" TIMESTAMPTZ(6),
  ADD COLUMN "sessionRoom" TEXT,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;
