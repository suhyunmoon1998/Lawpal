-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FIRM_ADMIN', 'ATTORNEY', 'PARALEGAL', 'STAFF', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('ACTIVE', 'PENDING', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GMAIL', 'GOOGLE_CALENDAR', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "OAuthStatus" AS ENUM ('CONNECTED', 'REQUIRES_REAUTH', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EmailReviewStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'REVIEW_REQUIRED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('AI_DRAFT', 'ATTORNEY_REVIEW_REQUIRED', 'ATTORNEY_APPROVED', 'LOCKED_FOR_COURT_USE', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('AUTO_DETECTED', 'ATTORNEY_REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('AUTO_DETECTED', 'AI_DRAFT', 'ATTORNEY_REVIEW_REQUIRED', 'ATTORNEY_APPROVED', 'LOCKED_FOR_COURT_USE', 'REJECTED', 'NEEDS_CORRECTION');

-- CreateEnum
CREATE TYPE "ApprovalTargetType" AS ENUM ('DRAFT_DEADLINE', 'CASE_DOCUMENT_VERSION', 'CALENDAR_EVENT');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('DRAFT', 'ATTORNEY_REVIEW_REQUIRED', 'APPROVED_INTERNAL', 'SYNCED_TO_GOOGLE', 'REJECTED');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('CALENDAR_DAYS', 'COURT_DAYS', 'BUSINESS_DAYS');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'OPPOSING_COUNSEL', 'COURT', 'EXPERT', 'VENDOR', 'OTHER');

-- CreateTable
CREATE TABLE "LawFirm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawFirm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedEmailAccount" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "oauthStatus" "OAuthStatus" NOT NULL DEFAULT 'CONNECTED',
    "syncCursor" TEXT,
    "lastSyncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "dailySyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailySyncHour" INTEGER NOT NULL DEFAULT 6,
    "dailySyncMinute" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedEmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMatter" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caseNumber" TEXT,
    "courtName" TEXT,
    "judgeName" TEXT,
    "department" TEXT,
    "partiesJson" JSONB,
    "aliases" TEXT[],
    "status" "MatterStatus" NOT NULL DEFAULT 'ACTIVE',
    "workspaceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "connectedEmailAccountId" TEXT NOT NULL,
    "caseMatterId" TEXT,
    "providerMessageId" TEXT NOT NULL,
    "providerThreadId" TEXT,
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddresses" TEXT[],
    "ccAddresses" TEXT[],
    "bccAddresses" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND',
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "immutableRawRef" TEXT,
    "extractionJson" JSONB,
    "classificationScore" DOUBLE PRECISION,
    "reviewStatus" "EmailReviewStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "providerAttachmentId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT,
    "extractedText" TEXT,
    "extractionJson" JSONB,
    "immutableOriginalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRuleSource" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "ruleSection" TEXT NOT NULL,
    "exactText" TEXT NOT NULL,
    "verifiedExcerpt" TEXT,
    "sourceUrl" TEXT,
    "uploadedSourceReference" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "lastVerifiedDate" TIMESTAMP(3) NOT NULL,
    "calculationType" "CalculationType" NOT NULL,
    "serviceExtensionLogic" TEXT,
    "holidayAdjustmentLogic" TEXT,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "attorneyVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalRuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineRule" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT,
    "legalRuleSourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "responseDays" INTEGER,
    "serviceExtensionDays" INTEGER,
    "appliesWhenJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineTrigger" (
    "id" TEXT NOT NULL,
    "caseMatterId" TEXT NOT NULL,
    "sourceEmailId" TEXT,
    "sourceAttachmentId" TEXT,
    "deadlineRuleId" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerDate" TIMESTAMP(3) NOT NULL,
    "serviceDate" TIMESTAMP(3),
    "serviceMethod" TEXT,
    "extractedFactsJson" JSONB,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftDeadline" (
    "id" TEXT NOT NULL,
    "caseMatterId" TEXT NOT NULL,
    "sourceEmailId" TEXT,
    "sourceAttachmentId" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerDate" TIMESTAMP(3) NOT NULL,
    "serviceDate" TIMESTAMP(3),
    "serviceMethod" TEXT,
    "legalRuleSourceId" TEXT,
    "ruleSection" TEXT,
    "calculatedDeadlineDate" TIMESTAMP(3) NOT NULL,
    "calculationExplanation" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'AUTO_DETECTED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "caseMatterId" TEXT,
    "connectedEmailAccountId" TEXT,
    "draftDeadlineId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "googleEventId" TEXT,
    "internalOnly" BOOLEAN NOT NULL DEFAULT true,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'DRAFT',
    "warningLabel" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'ATTORNEY_REVIEW_REQUIRED',
    "sourceEmailId" TEXT,
    "sourceAttachmentId" TEXT,
    "legalRuleSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "caseMatterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "latestVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generatedFromEmailIds" TEXT[],
    "generatedFromAttachmentIds" TEXT[],
    "changeSummary" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ATTORNEY_REVIEW_REQUIRED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChangeLog" (
    "id" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeContent" TEXT,
    "afterContent" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'ATTORNEY_REVIEW_REQUIRED',

    CONSTRAINT "DocumentChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyApproval" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetType" "ApprovalTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "comment" TEXT,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttorneyApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actionType" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceEmailId" TEXT,
    "sourceDocumentId" TEXT,
    "legalRuleSourceId" TEXT,
    "approvalStatus" "ApprovalStatus",
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "caseMatterId" TEXT,
    "ownerUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "caseMatterId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "organization" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentVersionRuleSources" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LawFirm_slug_key" ON "LawFirm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedEmailAccount_provider_emailAddress_key" ON "ConnectedEmailAccount"("provider", "emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMatter_workspaceKey_key" ON "CaseMatter"("workspaceKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_providerMessageId_key" ON "EmailMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAttachment_emailMessageId_providerAttachmentId_key" ON "EmailAttachment"("emailMessageId", "providerAttachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseDocument_latestVersionId_key" ON "CaseDocument"("latestVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseDocumentVersion_documentId_versionNumber_key" ON "CaseDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "_DocumentVersionRuleSources_AB_unique" ON "_DocumentVersionRuleSources"("A", "B");

-- CreateIndex
CREATE INDEX "_DocumentVersionRuleSources_B_index" ON "_DocumentVersionRuleSources"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedEmailAccount" ADD CONSTRAINT "ConnectedEmailAccount_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMatter" ADD CONSTRAINT "CaseMatter_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_connectedEmailAccountId_fkey" FOREIGN KEY ("connectedEmailAccountId") REFERENCES "ConnectedEmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalRuleSource" ADD CONSTRAINT "LegalRuleSource_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineRule" ADD CONSTRAINT "DeadlineRule_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineRule" ADD CONSTRAINT "DeadlineRule_legalRuleSourceId_fkey" FOREIGN KEY ("legalRuleSourceId") REFERENCES "LegalRuleSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineTrigger" ADD CONSTRAINT "DeadlineTrigger_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineTrigger" ADD CONSTRAINT "DeadlineTrigger_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineTrigger" ADD CONSTRAINT "DeadlineTrigger_sourceAttachmentId_fkey" FOREIGN KEY ("sourceAttachmentId") REFERENCES "EmailAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineTrigger" ADD CONSTRAINT "DeadlineTrigger_deadlineRuleId_fkey" FOREIGN KEY ("deadlineRuleId") REFERENCES "DeadlineRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftDeadline" ADD CONSTRAINT "DraftDeadline_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftDeadline" ADD CONSTRAINT "DraftDeadline_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftDeadline" ADD CONSTRAINT "DraftDeadline_sourceAttachmentId_fkey" FOREIGN KEY ("sourceAttachmentId") REFERENCES "EmailAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftDeadline" ADD CONSTRAINT "DraftDeadline_legalRuleSourceId_fkey" FOREIGN KEY ("legalRuleSourceId") REFERENCES "LegalRuleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftDeadline" ADD CONSTRAINT "DraftDeadline_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_connectedEmailAccountId_fkey" FOREIGN KEY ("connectedEmailAccountId") REFERENCES "ConnectedEmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_draftDeadlineId_fkey" FOREIGN KEY ("draftDeadlineId") REFERENCES "DraftDeadline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocumentVersion" ADD CONSTRAINT "CaseDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CaseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocumentVersion" ADD CONSTRAINT "CaseDocumentVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChangeLog" ADD CONSTRAINT "DocumentChangeLog_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CaseDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyApproval" ADD CONSTRAINT "AttorneyApproval_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_legalRuleSourceId_fkey" FOREIGN KEY ("legalRuleSourceId") REFERENCES "LegalRuleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "LawFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_caseMatterId_fkey" FOREIGN KEY ("caseMatterId") REFERENCES "CaseMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentVersionRuleSources" ADD CONSTRAINT "_DocumentVersionRuleSources_A_fkey" FOREIGN KEY ("A") REFERENCES "CaseDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentVersionRuleSources" ADD CONSTRAINT "_DocumentVersionRuleSources_B_fkey" FOREIGN KEY ("B") REFERENCES "LegalRuleSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
