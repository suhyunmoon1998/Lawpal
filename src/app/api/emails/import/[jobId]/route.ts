import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmailImportJob, getImportJobSnapshot } from "@/services/queue.service";

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const session = await requireApiSession();
  const job = await getEmailImportJob(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  }

  const account = await prisma.connectedEmailAccount.findUnique({
    where: { id: job.data.connectedEmailAccountId }
  });

  if (!account || account.lawFirmId !== session.lawFirmId) {
    return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  }

  return NextResponse.json({
    job: await getImportJobSnapshot(job)
  });
}
