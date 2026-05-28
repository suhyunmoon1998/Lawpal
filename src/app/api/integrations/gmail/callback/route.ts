import { NextResponse } from "next/server";
import { verifyIntegrationState } from "@/lib/integration-state";
import { exchangeGmailCodeForTokens, upsertConnectedGmailAccount } from "@/services/gmail.service";
import { recordAuditLog } from "@/services/audit-log.service";
import { enqueueGmailImportJob } from "@/services/queue.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/settings?gmail=error&reason=${encodeURIComponent(oauthError)}`, url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?gmail=missing_callback_params", url));
  }

  try {
    const verifiedState = await verifyIntegrationState(state);
    const result = await exchangeGmailCodeForTokens(code);
    const account = await upsertConnectedGmailAccount({
      lawFirmId: verifiedState.lawFirmId,
      emailAddress: result.emailAddress,
      tokens: result.tokens,
      historyId: result.historyId
    });

    await recordAuditLog({
      lawFirmId: verifiedState.lawFirmId,
      actorUserId: verifiedState.userId,
      actionType: "GMAIL_ACCOUNT_CONNECTED",
      sourceEntityType: "ConnectedEmailAccount",
      sourceEntityId: account.id,
      afterValue: {
        emailAddress: account.emailAddress,
        scopes: account.scopes
      }
    });

    await enqueueGmailImportJob({
      connectedEmailAccountId: account.id,
      lawFirmId: verifiedState.lawFirmId,
      actorUserId: verifiedState.userId
    });

    return NextResponse.redirect(new URL("/settings?gmail=connected", url));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "gmail_callback_failed";
    return NextResponse.redirect(new URL(`/settings?gmail=error&reason=${encodeURIComponent(reason)}`, url));
  }
}
