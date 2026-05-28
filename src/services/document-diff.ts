export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  content: string;
};

export function buildSimpleLineDiff(previousContent: string, currentContent: string): DiffLine[] {
  const previousLines = previousContent.split("\n");
  const currentLines = currentContent.split("\n");
  const maxLength = Math.max(previousLines.length, currentLines.length);
  const diff: DiffLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const previousLine = previousLines[index];
    const currentLine = currentLines[index];

    if (previousLine === currentLine && previousLine !== undefined) {
      diff.push({ type: "unchanged", content: previousLine });
      continue;
    }

    if (previousLine !== undefined) {
      diff.push({ type: "removed", content: previousLine });
    }

    if (currentLine !== undefined) {
      diff.push({ type: "added", content: currentLine });
    }
  }

  return diff;
}
