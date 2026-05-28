"use client";

type InfoHintProps = {
  label: string;
};

export function InfoHint({ label }: InfoHintProps) {
  return (
    <span className="info-hint" tabIndex={0} aria-label={label}>
      <span className="info-hint-trigger">?</span>
      <span className="info-hint-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}
