import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCaseSchema } from "@/lib/validators";
import { buildCaseWorkspacePaths } from "@/services/storage.service";
import { ensureLivingCaseDocuments } from "@/services/case-document-automation.service";

export async function GET() {
  const session = await requireApiSession();
  const cases = await prisma.caseMatter.findMany({
    where: { lawFirmId: session.lawFirmId },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  const payload = createCaseSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const workspaceKey = `${session.lawFirmId}/${Date.now()}-${payload.data.name.toLowerCase().replace(/\s+/g, "-")}`;

  const caseMatter = await prisma.caseMatter.create({
    data: {
      lawFirmId: session.lawFirmId,
      name: payload.data.name,
      caseNumber: payload.data.caseNumber,
      courtName: payload.data.courtName,
      judgeName: payload.data.judgeName,
      department: payload.data.department,
      aliases: payload.data.aliases,
      workspaceKey
    }
  });

  const documents = await ensureLivingCaseDocuments(caseMatter.id);

  return NextResponse.json({
    caseMatter,
    workspace: buildCaseWorkspacePaths(workspaceKey),
    livingDocuments: documents
  });
}
