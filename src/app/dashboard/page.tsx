import { AppShell } from "@/components/app-shell";
import { DashboardSurface } from "@/components/dashboard-surface";
import { requireSession } from "@/lib/auth";
import { getTodayReviewQueue } from "@/services/review-queue.service";

export default async function DashboardPage() {
  const session = await requireSession();
  const reviewQueue = await getTodayReviewQueue(session.lawFirmId);

  return (
    <AppShell>
      <DashboardSurface reviewQueue={reviewQueue} />
    </AppShell>
  );
}
