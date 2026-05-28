import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  tone = "warning"
}: {
  label: string;
  tone?: "warning" | "success" | "danger";
}) {
  return <span className={cn("status-badge", tone)}>{label}</span>;
}
