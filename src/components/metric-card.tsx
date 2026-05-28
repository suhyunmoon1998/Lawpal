import { InfoHint } from "@/components/info-hint";

export function MetricCard({
  label,
  value,
  note,
  kicker = "Live Queue",
  compact = false
}: {
  label: string;
  value: number | string;
  note: string;
  kicker?: string;
  compact?: boolean;
}) {
  return (
    <article className={`card metric-card${compact ? " compact" : ""}`}>
      <span className="metric-kicker">{kicker}</span>
      <div className="metric-label-row">
        <div className="metric-label">{label}</div>
        <InfoHint label={note} />
      </div>
      <div className="metric-value">{value}</div>
      {!compact ? <div className="metric-note">{note}</div> : null}
    </article>
  );
}
