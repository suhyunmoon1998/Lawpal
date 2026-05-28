import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createDraftDocumentVersion } from "@/services/document-versioning.service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const body = (await request.json()) as {
    documentId: string;
    content: string;
    generatedFromEmailIds: string[];
    generatedFromAttachmentIds: string[];
    legalRuleSourceIds: string[];
    changeSummary: string;
  };

  const version = await createDraftDocumentVersion({
    ...body,
    actorUserId: session.userId,
    lawFirmId: session.lawFirmId
  });

  return NextResponse.json(version);
}
