import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { signIntegrationState } from "@/lib/integration-state";
import { buildStructuredExtraction } from "@/services/extraction.service";
import { matchCaseFromEmail } from "@/services/case-matching.service";
import { recordAuditLog } from "@/services/audit-log.service";
import { buildEmailStorageKey, persistImmutableFile } from "@/services/storage.service";
import { createDraftDeadlinesFromEmail } from "@/services/deadline-trigger.service";
import { updateLivingCaseDocumentsFromEmail } from "@/services/case-document-automation.service";
import { extractMessageIdsFromHistory, type GmailHistoryRecord } from "@/services/gmail-history";
import { upsertDailyGmailImportSchedule } from "@/services/queue.service";

type GmailTokenResponse = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
};

type GmailMessagePart = {
  mimeType?: string | null;
  filename?: string | null;
  body?: {
    data?: string | null;
    attachmentId?: string | null;
  } | null;
  parts?: GmailMessagePart[] | null;
};

function createOauthClient(redirectUri = process.env.GOOGLE_REDIRECT_URI) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function decodeBase64Url(value?: string | null) {
  if (!value) return "";
  return Buffer.from(value, "base64url").toString("utf8");
}

function flattenParts(parts?: GmailMessagePart[] | null): GmailMessagePart[] {
  if (!parts?.length) return [];
  return parts.flatMap((part) => [part, ...flattenParts(part.parts)]);
}

function extractBodies(payload: GmailMessagePart | undefined) {
  const parts = [payload, ...flattenParts(payload?.parts)].filter(Boolean) as GmailMessagePart[];
  const plainText = parts.find((part) => part.mimeType === "text/plain" && part.body?.data)?.body?.data;
  const html = parts.find((part) => part.mimeType === "text/html" && part.body?.data)?.body?.data;

  return {
    bodyText: decodeBase64Url(plainText),
    bodyHtml: decodeBase64Url(html)
  };
}

function collectAttachmentMetadata(payload: GmailMessagePart | undefined, accountId: string, messageId: string) {
  const parts = [payload, ...flattenParts(payload?.parts)].filter(Boolean) as GmailMessagePart[];

  return parts
    .filter((part) => part.filename)
    .map((part, index) => ({
      providerAttachmentId: part.body?.attachmentId ?? `inline-${index}`,
      fileName: part.filename ?? `attachment-${index + 1}`,
      mimeType: part.mimeType ?? "application/octet-stream",
      storageKey: `gmail/${accountId}/${messageId}/${part.filename ?? `attachment-${index + 1}`}`,
      inlineData: part.body?.data ?? null,
      immutableOriginalRef: `gmail://messages/${messageId}/attachments/${part.body?.attachmentId ?? `inline-${index}`}`
    }));
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, target: string) {
  return headers?.find((header) => header.name?.toLowerCase() === target.toLowerCase())?.value ?? "";
}

function parseEmailAddresses(value: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMessageDate(value: string | undefined) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function createAuthorizedGmailClient(connectedEmailAccountId: string) {
  const account = await prisma.connectedEmailAccount.findUniqueOrThrow({
    where: { id: connectedEmailAccountId }
  });

  if (account.provider !== "GMAIL") {
    throw new Error("Connected account is not a Gmail account.");
  }

  const oauth2 = createOauthClient();
  oauth2.setCredentials({
    access_token: decryptSecret(account.encryptedAccessToken),
    refresh_token: account.encryptedRefreshToken
      ? decryptSecret(account.encryptedRefreshToken)
      : undefined
  });

  return {
    account,
    oauth2,
    gmail: google.gmail({ version: "v1", auth: oauth2 })
  };
}

async function persistEmailFromGmailMessage(input: {
  lawFirmId: string;
  connectedEmailAccountId: string;
  gmailAccountEmail: string;
  gmail: ReturnType<typeof google.gmail>;
  actorUserId?: string;
  message: {
    id?: string | null;
    threadId?: string | null;
    internalDate?: string | null;
    payload?: {
      headers?: Array<{ name?: string | null; value?: string | null }>;
      mimeType?: string | null;
      filename?: string | null;
      body?: { data?: string | null; attachmentId?: string | null } | null;
      parts?: GmailMessagePart[] | null;
    } | null;
  };
}) {
  const knownCases = await prisma.caseMatter.findMany({
    where: { lawFirmId: input.lawFirmId },
    select: {
      id: true,
      caseNumber: true,
      name: true,
      aliases: true,
      courtName: true,
      workspaceKey: true
    }
  });

  const payload = (input.message.payload ?? undefined) as GmailMessagePart | undefined;
  const headers = input.message.payload?.headers;
  const subject = getHeader(headers, "Subject");
  const fromAddress = getHeader(headers, "From");
  const toAddresses = parseEmailAddresses(getHeader(headers, "To"));
  const ccAddresses = parseEmailAddresses(getHeader(headers, "Cc"));
  const bccAddresses = parseEmailAddresses(getHeader(headers, "Bcc"));
  const { bodyText, bodyHtml } = extractBodies(payload);
  const attachments = collectAttachmentMetadata(
    payload,
    input.connectedEmailAccountId,
    input.message.id ?? "unknown-message"
  );
  const extraction = buildStructuredExtraction({
    subject,
    bodyText,
    attachmentNames: attachments.map((attachment) => attachment.fileName)
  });
  const match = matchCaseFromEmail({
    knownCases,
    subject,
    bodyText,
    attachmentNames: attachments.map((attachment) => attachment.fileName)
  });
  const matchedCaseWorkspaceKey =
    knownCases.find((caseItem: (typeof knownCases)[number]) => caseItem.id === match.caseMatterId)?.workspaceKey ??
    null;

  const emailMessage = await prisma.emailMessage.upsert({
    where: { providerMessageId: input.message.id ?? "" },
    update: {
      caseMatterId: match.caseMatterId,
      providerThreadId: input.message.threadId ?? undefined,
      subject,
      fromAddress,
      toAddresses,
      ccAddresses,
      bccAddresses,
      sentAt: parseMessageDate(getHeader(headers, "Date")),
      receivedAt: input.message.internalDate ? new Date(Number(input.message.internalDate)) : new Date(),
      direction: fromAddress.toLowerCase().includes(input.gmailAccountEmail.toLowerCase()) ? "OUTBOUND" : "INBOUND",
      bodyText,
      bodyHtml,
      immutableRawRef: `gmail://messages/${input.message.id}`,
      extractionJson: extraction,
      classificationScore: match.confidenceScore,
      reviewStatus: match.requiresManualAssignment ? "UNASSIGNED" : "REVIEW_REQUIRED",
      hasAttachments: attachments.length > 0
    },
    create: {
      lawFirmId: input.lawFirmId,
      connectedEmailAccountId: input.connectedEmailAccountId,
      caseMatterId: match.caseMatterId,
      providerMessageId: input.message.id ?? "",
      providerThreadId: input.message.threadId ?? undefined,
      subject,
      fromAddress,
      toAddresses,
      ccAddresses,
      bccAddresses,
      sentAt: parseMessageDate(getHeader(headers, "Date")),
      receivedAt: input.message.internalDate ? new Date(Number(input.message.internalDate)) : new Date(),
      direction: fromAddress.toLowerCase().includes(input.gmailAccountEmail.toLowerCase()) ? "OUTBOUND" : "INBOUND",
      bodyText,
      bodyHtml,
      immutableRawRef: `gmail://messages/${input.message.id}`,
      extractionJson: extraction,
      classificationScore: match.confidenceScore,
      reviewStatus: match.requiresManualAssignment ? "UNASSIGNED" : "REVIEW_REQUIRED",
      hasAttachments: attachments.length > 0
    }
  });

  await prisma.emailAttachment.deleteMany({
    where: { emailMessageId: emailMessage.id }
  });

  if (attachments.length > 0) {
    const storageEntries = [];

    for (const attachment of attachments) {
      let content = attachment.inlineData ? Buffer.from(attachment.inlineData, "base64url") : null;

      if (!content && attachment.providerAttachmentId && input.message.id) {
        const attachmentResponse = await input.gmail.users.messages.attachments.get({
          userId: "me",
          messageId: input.message.id,
          id: attachment.providerAttachmentId
        });

        if (attachmentResponse.data.data) {
          content = Buffer.from(attachmentResponse.data.data, "base64url");
        }
      }

      if (!content) {
        continue;
      }

      const storageKey = buildEmailStorageKey({
        workspaceKey: matchedCaseWorkspaceKey,
        connectedEmailAccountId: input.connectedEmailAccountId,
        providerMessageId: emailMessage.providerMessageId,
        fileName: attachment.fileName
      });
      const persisted = await persistImmutableFile({
        storageKey,
        content
      });

      storageEntries.push({
        emailMessageId: emailMessage.id,
        providerAttachmentId: attachment.providerAttachmentId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        storageKey: persisted.storageKey,
        sha256: persisted.sha256,
        immutableOriginalRef: attachment.immutableOriginalRef
      });
    }

    if (storageEntries.length > 0) {
      await prisma.emailAttachment.createMany({
        data: storageEntries
      });
    }
  }

  const generatedDeadlines = await createDraftDeadlinesFromEmail({
    lawFirmId: input.lawFirmId,
    actorUserId: input.actorUserId,
    emailMessageId: emailMessage.id
  });
  const generatedDocumentVersions = await updateLivingCaseDocumentsFromEmail({
    lawFirmId: input.lawFirmId,
    actorUserId: input.actorUserId,
    emailMessageId: emailMessage.id
  });

  return {
    id: emailMessage.id,
    providerMessageId: emailMessage.providerMessageId,
    caseMatterId: emailMessage.caseMatterId,
    reviewStatus: emailMessage.reviewStatus,
    classificationScore: emailMessage.classificationScore,
    attachmentsImported: attachments.length,
    deadlinesCreated: generatedDeadlines.length,
    documentVersionsCreated: generatedDocumentVersions.length
  };
}

export async function createGmailOAuthUrl(input: { lawFirmId: string; userId: string }) {
  const oauth2 = createOauthClient();
  const state = await signIntegrationState({
    lawFirmId: input.lawFirmId,
    userId: input.userId,
    provider: "GMAIL"
  });

  return oauth2.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify"
    ],
    state,
    prompt: "consent"
  });
}

export async function exchangeGmailCodeForTokens(code: string) {
  const oauth2 = createOauthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    tokens,
    emailAddress: profile.data.emailAddress ?? "",
    historyId: profile.data.historyId ?? null
  };
}

export async function upsertConnectedGmailAccount(input: {
  lawFirmId: string;
  emailAddress: string;
  tokens: GmailTokenResponse;
  historyId?: string | null;
}) {
  if (!input.tokens.access_token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  const scopes = input.tokens.scope
    ? input.tokens.scope.split(" ").filter(Boolean)
    : [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify"
      ];

  return prisma.connectedEmailAccount.upsert({
    where: {
      provider_emailAddress: {
        provider: "GMAIL",
        emailAddress: input.emailAddress
      }
    },
    update: {
      lawFirmId: input.lawFirmId,
      encryptedAccessToken: encryptSecret(input.tokens.access_token),
      encryptedRefreshToken: input.tokens.refresh_token
        ? encryptSecret(input.tokens.refresh_token)
        : undefined,
      tokenExpiresAt: input.tokens.expiry_date ? new Date(input.tokens.expiry_date) : null,
      scopes,
      oauthStatus: "CONNECTED",
      syncCursor: input.historyId ?? undefined,
      lastSyncError: null
    },
    create: {
      lawFirmId: input.lawFirmId,
      provider: "GMAIL",
      emailAddress: input.emailAddress,
      displayName: input.emailAddress,
      encryptedAccessToken: encryptSecret(input.tokens.access_token),
      encryptedRefreshToken: input.tokens.refresh_token
        ? encryptSecret(input.tokens.refresh_token)
        : null,
      tokenExpiresAt: input.tokens.expiry_date ? new Date(input.tokens.expiry_date) : null,
      scopes,
      oauthStatus: "CONNECTED",
      syncCursor: input.historyId ?? undefined,
      dailySyncEnabled: true
    }
  }).then(async (account: {
    id: string;
    lawFirmId: string;
    emailAddress: string;
    scopes: string[];
    dailySyncEnabled: boolean;
    dailySyncHour: number;
    dailySyncMinute: number;
  }) => {
    if (account.dailySyncEnabled) {
      const lawFirm = await prisma.lawFirm.findUnique({
        where: { id: account.lawFirmId },
        select: { timezone: true }
      });

      await upsertDailyGmailImportSchedule({
        connectedEmailAccountId: account.id,
        lawFirmId: account.lawFirmId,
        hour: account.dailySyncHour,
        minute: account.dailySyncMinute,
        timezone: lawFirm?.timezone ?? "America/Los_Angeles"
      });
    }

    return account;
  });
}

export async function importRecentEmails(connectedEmailAccountId: string, actorUserId?: string) {
  const { account, gmail, oauth2 } = await createAuthorizedGmailClient(connectedEmailAccountId);

  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    const latestHistoryId = profile.data.historyId ?? account.syncCursor ?? undefined;
    let messageIdsToImport: string[] = [];
    let syncMode: "FULL_SYNC" | "INCREMENTAL_SYNC" = account.syncCursor ? "INCREMENTAL_SYNC" : "FULL_SYNC";

    if (account.syncCursor) {
      try {
        let nextPageToken: string | undefined;
        const historyEntries: GmailHistoryRecord[] = [];

        do {
          const historyResponse = await gmail.users.history.list({
            userId: "me",
            startHistoryId: account.syncCursor,
            historyTypes: ["messageAdded"],
            pageToken: nextPageToken
          });

          historyEntries.push(...((historyResponse.data.history as GmailHistoryRecord[] | undefined) ?? []));
          nextPageToken = historyResponse.data.nextPageToken ?? undefined;
        } while (nextPageToken);

        messageIdsToImport = extractMessageIdsFromHistory(historyEntries);
      } catch (error) {
        const code =
          typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "";

        if (code === 404 || message.toLowerCase().includes("start history id")) {
          syncMode = "FULL_SYNC";
          messageIdsToImport = [];
        } else {
          throw error;
        }
      }
    }

    if (syncMode === "FULL_SYNC") {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10
      });

      messageIdsToImport = (listResponse.data.messages ?? [])
        .map((messageRef) => messageRef.id ?? null)
        .filter((messageId): messageId is string => Boolean(messageId));
    }

    const imported = [];

    for (const messageId of messageIdsToImport) {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full"
      });

      imported.push(
        await persistEmailFromGmailMessage({
          lawFirmId: account.lawFirmId,
          connectedEmailAccountId: account.id,
          gmailAccountEmail: account.emailAddress,
          gmail,
          actorUserId,
          message: fullMessage.data
        })
      );
    }

    const credentials = oauth2.credentials;

    await prisma.connectedEmailAccount.update({
      where: { id: connectedEmailAccountId },
      data: {
        encryptedAccessToken: credentials.access_token
          ? encryptSecret(credentials.access_token)
          : account.encryptedAccessToken,
        encryptedRefreshToken:
          credentials.refresh_token !== undefined
            ? credentials.refresh_token
              ? encryptSecret(credentials.refresh_token)
              : null
            : account.encryptedRefreshToken,
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : account.tokenExpiresAt,
        oauthStatus: "CONNECTED",
        syncCursor: latestHistoryId,
        lastSyncedAt: new Date(),
        lastSyncError: null
      }
    });

    await recordAuditLog({
      lawFirmId: account.lawFirmId,
      actorUserId,
      actionType: "GMAIL_IMPORT_COMPLETED",
      sourceEntityType: "ConnectedEmailAccount",
      sourceEntityId: account.id,
      afterValue: {
        syncMode,
        previousCursor: account.syncCursor,
        nextCursor: latestHistoryId,
        importedCount: imported.length,
        messageIds: imported.map((item) => item.providerMessageId)
      }
    });

    return {
      connectedEmailAccountId: account.id,
      emailAddress: account.emailAddress,
      syncMode,
      previousCursor: account.syncCursor,
      nextCursor: latestHistoryId,
      importedCount: imported.length,
      imported
    };
  } catch (error) {
    await prisma.connectedEmailAccount.update({
      where: { id: connectedEmailAccountId },
      data: {
        oauthStatus: "REQUIRES_REAUTH",
        lastSyncError: error instanceof Error ? error.message : "Unknown Gmail sync error"
      }
    });

    throw error;
  }
}
