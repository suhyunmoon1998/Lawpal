import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { aiChatRequestSchema } from "@/lib/validators";
import { recordAuditLog } from "@/services/audit-log.service";
import { generateLawpetReply } from "@/services/ai-chat.service";

export async function POST(request: Request) {
  const session = await getSessionUser();
  const payload = aiChatRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const reply = await generateLawpetReply({
    attorneyName: session?.name,
    mascot: payload.data.mascot,
    pathname: payload.data.pathname,
    messages: payload.data.messages
  });

  if (session) {
    const latestUserMessage = [...payload.data.messages].reverse().find((message) => message.role === "user");

    await recordAuditLog({
      lawFirmId: session.lawFirmId,
      actorUserId: session.userId,
      actionType: "AI_CHAT_REPLY_GENERATED",
      sourceEntityType: "LawpetChat",
      sourceEntityId: session.userId,
      beforeValue: {
        pathname: payload.data.pathname ?? null,
        mascot: payload.data.mascot,
        userPrompt: latestUserMessage?.content ?? null
      },
      afterValue: {
        reply: reply.reply
      },
      approvalStatus: "AI_DRAFT"
    });
  }

  return NextResponse.json(reply);
}
