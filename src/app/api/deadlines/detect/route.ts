import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDraftDeadline } from "@/services/deadline-calculation.service";
import { getRuleSourceBySection } from "@/services/legal-rules-library.service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const body = (await request.json()) as {
    caseMatterId: string;
    sourceEmailId?: string;
    sourceAttachmentId?: string;
    triggerType: string;
    triggerDate: string;
    serviceDate?: string;
    serviceMethod?: string;
    ruleSection: string;
    responseDays: number;
    serviceExtensionDays?: number;
    calculationType: "CALENDAR_DAYS" | "COURT_DAYS" | "BUSINESS_DAYS";
  };

  const ruleSource = await getRuleSourceBySection(body.ruleSection, session.lawFirmId);

  if (!ruleSource) {
    return NextResponse.json({ error: "Verified rule source not found." }, { status: 404 });
  }

  const calculation = calculateDraftDeadline({
    triggerDate: new Date(body.triggerDate),
    responseDays: body.responseDays,
    serviceExtensionDays: body.serviceExtensionDays,
    serviceMethod: body.serviceMethod,
    calculationType: body.calculationType
  });

  const draftDeadline = await prisma.draftDeadline.create({
    data: {
      caseMatterId: body.caseMatterId,
      sourceEmailId: body.sourceEmailId,
      sourceAttachmentId: body.sourceAttachmentId,
      triggerType: body.triggerType,
      triggerDate: new Date(body.triggerDate),
      serviceDate: body.serviceDate ? new Date(body.serviceDate) : undefined,
      serviceMethod: body.serviceMethod,
      legalRuleSourceId: ruleSource.id,
      ruleSection: body.ruleSection,
      calculatedDeadlineDate: calculation.calculatedDeadlineDate,
      calculationExplanation: calculation.explanation,
      confidenceScore: ruleSource.confidenceLevel,
      status: "ATTORNEY_REVIEW_REQUIRED"
    }
  });

  return NextResponse.json({
    draftDeadline,
    warning: calculation.warning
  });
}
