-- AlterTable
ALTER TABLE "Appeal" ADD COLUMN     "deadlineExtendedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalationReason" TEXT;

-- CreateTable
CREATE TABLE "AppealAssignee" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppealAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppealAssignee_userId_idx" ON "AppealAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppealAssignee_appealId_userId_key" ON "AppealAssignee"("appealId", "userId");

-- AddForeignKey
ALTER TABLE "AppealAssignee" ADD CONSTRAINT "AppealAssignee_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "Appeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppealAssignee" ADD CONSTRAINT "AppealAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
