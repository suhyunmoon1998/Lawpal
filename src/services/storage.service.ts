import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export function getStorageDriver() {
  return process.env.STORAGE_DRIVER ?? "local";
}

export function buildCaseWorkspacePaths(workspaceKey: string) {
  const root = `${process.env.LOCAL_STORAGE_ROOT ?? "./uploads"}/${workspaceKey}`;

  return {
    root,
    emails: `${root}/emails`,
    attachments: `${root}/attachments`,
    extractedFacts: `${root}/extracted-facts`,
    proceduralHistory: `${root}/procedural-history`,
    deadlineHistory: `${root}/deadline-history`,
    discoveryTimeline: `${root}/discovery-timeline`,
    meetAndConferHistory: `${root}/meet-and-confer-history`,
    hearingFilingLog: `${root}/hearing-filing-log`,
    generatedDocuments: `${root}/generated-documents`,
    documentVersions: `${root}/document-versions`,
    approvalHistory: `${root}/approval-history`,
    auditTrail: `${root}/audit-trail`
  };
}

function getLocalStorageRoot() {
  return path.resolve(process.cwd(), process.env.LOCAL_STORAGE_ROOT ?? "./uploads");
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function buildEmailStorageKey(input: {
  workspaceKey?: string | null;
  connectedEmailAccountId: string;
  providerMessageId: string;
  fileName: string;
}) {
  const basePrefix = input.workspaceKey
    ? input.workspaceKey.split("/").map(sanitizePathSegment)
    : ["unassigned", sanitizePathSegment(input.connectedEmailAccountId)];

  return path.posix.join(
    ...basePrefix,
    "attachments",
    sanitizePathSegment(input.providerMessageId),
    sanitizePathSegment(input.fileName)
  );
}

export async function persistImmutableFile(input: {
  storageKey: string;
  content: Buffer;
}) {
  if (getStorageDriver() !== "local") {
    throw new Error("Only local storage is implemented in the MVP scaffold.");
  }

  const absolutePath = path.join(getLocalStorageRoot(), input.storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.content);

  return {
    storageKey: input.storageKey,
    absolutePath,
    sha256: createHash("sha256").update(input.content).digest("hex")
  };
}
