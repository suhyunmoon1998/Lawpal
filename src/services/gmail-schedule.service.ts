import { prisma } from "@/lib/prisma";

type SettingsAccountRow = {
  id: string;
  emailAddress: string;
  oauthStatus: string;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  dailySyncEnabled: boolean;
  dailySyncHour: number;
  dailySyncMinute: number;
  lawFirm: {
    timezone: string;
  };
};

function formatSyncTime(hour: number, minute: number, timezone: string) {
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(date);
}

export async function getGmailAccountsForSettings(lawFirmId: string) {
  const accounts = await prisma.connectedEmailAccount.findMany({
    where: {
      lawFirmId,
      provider: "GMAIL"
    },
    include: {
      lawFirm: {
        select: {
          timezone: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return accounts.map((account: SettingsAccountRow) => ({
    id: account.id,
    emailAddress: account.emailAddress,
    oauthStatus: account.oauthStatus,
    lastSyncedAt: account.lastSyncedAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }).format(account.lastSyncedAt)
      : null,
    lastSyncError: account.lastSyncError,
    dailySyncEnabled: account.dailySyncEnabled,
    dailySyncHour: account.dailySyncHour,
    dailySyncMinute: account.dailySyncMinute,
    timezone: account.lawFirm.timezone,
    scheduleLabel: formatSyncTime(account.dailySyncHour, account.dailySyncMinute, account.lawFirm.timezone)
  }));
}

export function getDailySyncScheduleLabel(input: { hour: number; minute: number; timezone: string }) {
  return formatSyncTime(input.hour, input.minute, input.timezone);
}
