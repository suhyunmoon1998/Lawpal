import { cn } from "@/lib/utils";

export function LawpelWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("lawpel-wordmark", compact && "compact")} aria-label="Lawpel">
      <img className="lawpel-wordmark-mark" src="/lawpel-symbol.svg" alt="" aria-hidden="true" />
      <span className="lawpel-wordmark-text">
        <span className="lawpel-wordmark-law">Law</span>
        <span className="lawpel-wordmark-pel">pel</span>
      </span>
    </div>
  );
}
