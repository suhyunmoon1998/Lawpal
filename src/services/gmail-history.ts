export type GmailHistoryRecord = {
  messagesAdded?: Array<{
    message?: {
      id?: string | null;
    } | null;
  }> | null;
};

export function extractMessageIdsFromHistory(history: GmailHistoryRecord[]) {
  return Array.from(
    new Set(
      history.flatMap((entry) =>
        (entry.messagesAdded ?? [])
          .map((item) => item.message?.id ?? null)
          .filter((messageId): messageId is string => Boolean(messageId))
      )
    )
  );
}
