import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireApiSession();
  const logs = await prisma.auditLog.findMany({
    where: { lawFirmId: session.lawFirmId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json(logs);
}
