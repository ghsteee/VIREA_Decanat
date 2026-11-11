-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'staff');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "StudyForm" AS ENUM ('full_time', 'part_time', 'extramural');

-- CreateEnum
CREATE TYPE "Funding" AS ENUM ('budget', 'paid');

-- CreateEnum
CREATE TYPE "LessonKind" AS ENUM ('lecture', 'practice', 'lab');

-- CreateEnum
CREATE TYPE "LessonFormat" AS ENUM ('offline', 'online');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('scheduled', 'cancelled');

-- CreateEnum
CREATE TYPE "LessonChangeKind" AS ENUM ('moved', 'cancelled', 'room_changed', 'format_changed', 'restored');

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('student', 'group_head', 'staff');

-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('lab', 'practice', 'test', 'essay', 'exam', 'credit', 'attendance');

-- CreateEnum
CREATE TYPE "ResultScale" AS ENUM ('points100', 'grade5', 'pass_fail');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('admitted', 'at_risk', 'not_admitted');

-- CreateEnum
CREATE TYPE "AdmissionItemStatus" AS ENUM ('done', 'pending', 'overdue');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('electronic', 'pickup');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'in_progress', 'ready', 'issued', 'rejected');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('lesson_change', 'deadline', 'deadline_reminder', 'announcement', 'application_status');

-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('urgent', 'normal');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('webPush', 'email');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'leased', 'accepted', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "EmailMode" AS ENUM ('immediate', 'digest');

-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "ReminderOffset" AS ENUM ('d3', 'd1');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('scheduled', 'sent', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "disabledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "course" INTEGER NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "programme" TEXT NOT NULL,
    "studyForm" "StudyForm" NOT NULL DEFAULT 'full_time',
    "funding" "Funding" NOT NULL DEFAULT 'budget',
    "studentCardNo" TEXT NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupHead" (
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,

    CONSTRAINT "GroupHead_pkey" PRIMARY KEY ("groupId")
);

-- CreateTable
CREATE TABLE "StaffInstitute" (
    "userId" UUID NOT NULL,
    "instituteId" UUID NOT NULL,

    CONSTRAINT "StaffInstitute_pkey" PRIMARY KEY ("userId","instituteId")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "userId" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'system',

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "sessionStartsOn" DATE,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicWeek" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,

    CONSTRAINT "AcademicWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapUrl" TEXT,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "campusId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "kind" "LessonKind" NOT NULL,
    "subgroup" INTEGER,
    "roomId" UUID,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "format" "LessonFormat" NOT NULL DEFAULT 'offline',
    "onlineUrl" TEXT,
    "status" "LessonStatus" NOT NULL DEFAULT 'scheduled',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTeacher" (
    "lessonId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,

    CONSTRAINT "LessonTeacher_pkey" PRIMARY KEY ("lessonId","teacherId")
);

-- CreateTable
CREATE TABLE "LessonChange" (
    "id" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" "LessonChangeKind" NOT NULL,
    "authorId" UUID NOT NULL,
    "authorRole" "AuthorRole" NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "previousStartsAt" TIMESTAMPTZ(6) NOT NULL,
    "newStartsAt" TIMESTAMPTZ(6) NOT NULL,
    "previousEndsAt" TIMESTAMPTZ(6) NOT NULL,
    "newEndsAt" TIMESTAMPTZ(6) NOT NULL,
    "previousFormat" "LessonFormat" NOT NULL,
    "newFormat" "LessonFormat" NOT NULL,
    "previousRoomId" UUID,
    "newRoomId" UUID,
    "previousOnlineUrl" TEXT,
    "newOnlineUrl" TEXT,
    "previousStatus" "LessonStatus" NOT NULL,
    "newStatus" "LessonStatus" NOT NULL,

    CONSTRAINT "LessonChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "kind" "AssessmentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "maxPoints" INTEGER,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "scale" "ResultScale" NOT NULL,
    "value" INTEGER,
    "passed" BOOLEAN,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermStanding" (
    "studentId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "status" "AdmissionStatus" NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StudentTermStanding_pkey" PRIMARY KEY ("studentId","termId")
);

-- CreateTable
CREATE TABLE "AdmissionItem" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ(6),
    "status" "AdmissionItemStatus" NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdmissionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorRole" "AuthorRole" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "subjectId" UUID,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "dueVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineGroup" (
    "deadlineId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "DeadlineGroup_pkey" PRIMARY KEY ("deadlineId","groupId")
);

-- CreateTable
CREATE TABLE "DeadlineProgress" (
    "deadlineId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DeadlineProgress_pkey" PRIMARY KEY ("deadlineId","studentId")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorRole" "AuthorRole" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementGroup" (
    "announcementId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "AnnouncementGroup_pkey" PRIMARY KEY ("announcementId","groupId")
);

-- CreateTable
CREATE TABLE "ApplicationType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "deliveryMethods" "DeliveryMethod"[],
    "leadTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApplicationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "studentId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "submissionGroupId" UUID NOT NULL,
    "formData" JSONB NOT NULL,
    "profileSnapshot" JSONB NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousId" UUID,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejectReason" TEXT,
    "pickupNote" TEXT,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupSlot" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "place" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PickupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupReservation" (
    "id" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "importance" "Importance" NOT NULL DEFAULT 'normal',
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "lessonChangeId" UUID,
    "deadlineId" UUID,
    "announcementId" UUID,
    "statusEventId" UUID,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(6),

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "pushSubscriptionId" UUID,
    "emailSubscriptionId" UUID,
    "destinationKey" TEXT NOT NULL,
    "mode" "EmailMode",
    "digestId" UUID,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMPTZ(6),
    "acceptedAt" TIMESTAMPTZ(6),
    "lastErrorCode" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDigest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "DigestStatus" NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMPTZ(6),

    CONSTRAINT "EmailDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineReminder" (
    "id" UUID NOT NULL,
    "deadlineId" UUID NOT NULL,
    "dueVersion" INTEGER NOT NULL,
    "offset" "ReminderOffset" NOT NULL,
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "DeadlineReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addressEncrypted" TEXT NOT NULL,
    "verifiedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "codeHmac" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "endpointHash" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "HelpDocument" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),

    CONSTRAINT "HelpDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpDocumentSection" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "heading" TEXT,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "HelpDocumentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_code_key" ON "Institute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE INDEX "Group_instituteId_course_idx" ON "Group"("instituteId", "course");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentCardNo_key" ON "StudentProfile"("studentCardNo");

-- CreateIndex
CREATE INDEX "StudentProfile_groupId_idx" ON "StudentProfile"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupHead_studentId_key" ON "GroupHead"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicWeek_termId_number_key" ON "AcademicWeek"("termId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_code_key" ON "Campus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_campusId_number_key" ON "Room"("campusId", "number");

-- CreateIndex
CREATE INDEX "Lesson_groupId_startsAt_idx" ON "Lesson"("groupId", "startsAt");

-- CreateIndex
CREATE INDEX "LessonChange_previousStartsAt_lessonId_idx" ON "LessonChange"("previousStartsAt", "lessonId");

-- CreateIndex
CREATE INDEX "LessonChange_newStartsAt_lessonId_idx" ON "LessonChange"("newStartsAt", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonChange_lessonId_version_key" ON "LessonChange"("lessonId", "version");

-- CreateIndex
CREATE INDEX "Assessment_groupId_termId_idx" ON "Assessment"("groupId", "termId");

-- CreateIndex
CREATE INDEX "AssessmentResult_studentId_publishedAt_idx" ON "AssessmentResult"("studentId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_studentId_assessmentId_key" ON "AssessmentResult"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "AdmissionItem_studentId_termId_subjectId_idx" ON "AdmissionItem"("studentId", "termId", "subjectId");

-- CreateIndex
CREATE INDEX "Deadline_dueAt_id_idx" ON "Deadline"("dueAt", "id");

-- CreateIndex
CREATE INDEX "DeadlineGroup_groupId_deadlineId_idx" ON "DeadlineGroup"("groupId", "deadlineId");

-- CreateIndex
CREATE INDEX "AnnouncementGroup_groupId_announcementId_idx" ON "AnnouncementGroup"("groupId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationType_code_key" ON "ApplicationType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Application_number_key" ON "Application"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Application_previousId_key" ON "Application"("previousId");

-- CreateIndex
CREATE INDEX "Application_studentId_status_submittedAt_idx" ON "Application"("studentId", "status", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "Application_submissionGroupId_status_submittedAt_idx" ON "Application"("submissionGroupId", "status", "submittedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatusEvent_applicationId_version_key" ON "ApplicationStatusEvent"("applicationId", "version");

-- CreateIndex
CREATE INDEX "PickupSlot_instituteId_startsAt_idx" ON "PickupSlot"("instituteId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PickupReservation_slotId_key" ON "PickupReservation"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupReservation_applicationId_key" ON "PickupReservation"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");

-- CreateIndex
CREATE INDEX "Notification_publishedAt_id_idx" ON "Notification"("publishedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_readAt_idx" ON "NotificationRecipient"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_recipientId_channel_destinationKey_key" ON "NotificationDelivery"("recipientId", "channel", "destinationKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDigest_userId_date_key" ON "EmailDigest"("userId", "date");

-- CreateIndex
CREATE INDEX "DeadlineReminder_status_scheduledAt_idx" ON "DeadlineReminder"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeadlineReminder_deadlineId_dueVersion_offset_key" ON "DeadlineReminder"("deadlineId", "dueVersion", "offset");

-- CreateIndex
CREATE INDEX "EmailSubscription_userId_idx" ON "EmailSubscription"("userId");

-- CreateIndex
CREATE INDEX "EmailVerification_subscriptionId_idx" ON "EmailVerification"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpointHash_key" ON "PushSubscription"("endpointHash");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "HelpDocument_source_version_key" ON "HelpDocument"("source", "version");

-- CreateIndex
CREATE UNIQUE INDEX "HelpDocumentSection_documentId_number_key" ON "HelpDocumentSection"("documentId", "number");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHead" ADD CONSTRAINT "GroupHead_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHead" ADD CONSTRAINT "GroupHead_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInstitute" ADD CONSTRAINT "StaffInstitute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInstitute" ADD CONSTRAINT "StaffInstitute_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicWeek" ADD CONSTRAINT "AcademicWeek_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTeacher" ADD CONSTRAINT "LessonTeacher_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTeacher" ADD CONSTRAINT "LessonTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonChange" ADD CONSTRAINT "LessonChange_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonChange" ADD CONSTRAINT "LessonChange_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermStanding" ADD CONSTRAINT "StudentTermStanding_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermStanding" ADD CONSTRAINT "StudentTermStanding_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionItem" ADD CONSTRAINT "AdmissionItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionItem" ADD CONSTRAINT "AdmissionItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionItem" ADD CONSTRAINT "AdmissionItem_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineGroup" ADD CONSTRAINT "DeadlineGroup_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineGroup" ADD CONSTRAINT "DeadlineGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineProgress" ADD CONSTRAINT "DeadlineProgress_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineProgress" ADD CONSTRAINT "DeadlineProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ApplicationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_submissionGroupId_fkey" FOREIGN KEY ("submissionGroupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupSlot" ADD CONSTRAINT "PickupSlot_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReservation" ADD CONSTRAINT "PickupReservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PickupSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReservation" ADD CONSTRAINT "PickupReservation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_lessonChangeId_fkey" FOREIGN KEY ("lessonChangeId") REFERENCES "LessonChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_statusEventId_fkey" FOREIGN KEY ("statusEventId") REFERENCES "ApplicationStatusEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "NotificationRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_pushSubscriptionId_fkey" FOREIGN KEY ("pushSubscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_emailSubscriptionId_fkey" FOREIGN KEY ("emailSubscriptionId") REFERENCES "EmailSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "EmailDigest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDigest" ADD CONSTRAINT "EmailDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDigest" ADD CONSTRAINT "EmailDigest_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "EmailSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineReminder" ADD CONSTRAINT "DeadlineReminder_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSubscription" ADD CONSTRAINT "EmailSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "EmailSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpDocumentSection" ADD CONSTRAINT "HelpDocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HelpDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Ограничения, которых нет в языке схемы Prisma ───────────────────────

-- Одна неотозванная подписка на почту на пользователя (docs/data-model.md)
CREATE UNIQUE INDEX "EmailSubscription_userId_active_key"
  ON "EmailSubscription" ("userId") WHERE "revokedAt" IS NULL;

-- Время окончания позже начала
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_time_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "PickupSlot" ADD CONSTRAINT "PickupSlot_time_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_dates_check" CHECK ("endsOn" >= "startsOn");

-- Отказ по заявке — только с причиной (A4)
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_reject_reason_check"
  CHECK ("toStatus" <> 'rejected' OR ("rejectReason" IS NOT NULL AND length(btrim("rejectReason")) > 0));

-- Уведомление ссылается ровно на один источник
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_single_source_check"
  CHECK (num_nonnulls("lessonChangeId", "deadlineId", "announcementId", "statusEventId") = 1);

-- Доставка: канал совпадает с типом подписки
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_destination_check"
  CHECK (
    ("channel" = 'webPush' AND "pushSubscriptionId" IS NOT NULL AND "emailSubscriptionId" IS NULL)
    OR ("channel" = 'email' AND "emailSubscriptionId" IS NOT NULL AND "pushSubscriptionId" IS NULL)
  );

-- Курс группы и оценка по пятибалльной шкале — в разумных пределах
ALTER TABLE "Group" ADD CONSTRAINT "Group_course_check" CHECK ("course" BETWEEN 1 AND 6);
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_value_check"
  CHECK (
    ("scale" = 'points100' AND "value" BETWEEN 0 AND 100)
    OR ("scale" = 'grade5' AND "value" BETWEEN 2 AND 5)
    OR ("scale" = 'pass_fail' AND "passed" IS NOT NULL)
  );
