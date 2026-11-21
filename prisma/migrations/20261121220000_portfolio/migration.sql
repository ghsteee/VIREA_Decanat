CREATE TYPE "PortfolioKind" AS ENUM ('work', 'participation', 'award');
CREATE TYPE "PortfolioAward" AS ENUM ('winner', 'prize');
CREATE TABLE "PortfolioItem" (
  "id" UUID NOT NULL, "studentId" UUID NOT NULL, "kind" "PortfolioKind" NOT NULL,
  "award" "PortfolioAward", "title" VARCHAR(160) NOT NULL, "eventName" VARCHAR(120),
  "description" VARCHAR(2000) NOT NULL DEFAULT '', "occurredOn" DATE, "projectUrl" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PortfolioItem_award_check" CHECK (("kind" = 'award' AND "award" IS NOT NULL) OR ("kind" <> 'award' AND "award" IS NULL)),
  CONSTRAINT "PortfolioItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PortfolioItem_studentId_occurredOn_idx" ON "PortfolioItem"("studentId", "occurredOn");
CREATE TABLE "PortfolioAttachment" (
  "id" UUID NOT NULL, "itemId" UUID NOT NULL, "storageKey" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL, "contentType" TEXT NOT NULL, "bytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PortfolioAttachment_bytes_check" CHECK ("bytes" > 0 AND "bytes" <= 5242880),
  CONSTRAINT "PortfolioAttachment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PortfolioItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PortfolioAttachment_storageKey_key" ON "PortfolioAttachment"("storageKey");
CREATE INDEX "PortfolioAttachment_itemId_idx" ON "PortfolioAttachment"("itemId");
