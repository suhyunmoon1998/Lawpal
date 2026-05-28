import { DRAFT_WARNING } from "@/lib/constants";

export function ReviewBanner({ message = DRAFT_WARNING }: { message?: string }) {
  return (
    <div className="banner">
      <strong>Attorney Safeguard</strong>
      <span>{message}</span>
    </div>
  );
}
