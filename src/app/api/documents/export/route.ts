import { NextResponse } from "next/server";
import { canApprove, requireApiSession } from "@/lib/auth";
import { exportDocumentVersion } from "@/services/document-export.service";

export async function POST(request: Request) {
  const session = await requireApiSession();

  if (!canApprove(session.role)) {
    return NextResponse.json({ error: "Only attorneys or firm admins can export approved documents." }, { status: 403 });
  }

  const body = (await request.json()) as {
    documentVersionId: string;
    format: "docx" | "pdf";
  };

  const result = await exportDocumentVersion({
    documentVersionId: body.documentVersionId,
    format: body.format,
    lawFirmId: session.lawFirmId,
    actorUserId: session.userId
  });

  return new NextResponse(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName}"`
    }
  });
}
