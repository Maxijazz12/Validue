export type AnswerMetadata = {
  pasteDetected: boolean;
  pasteCount: number;
  timeSpentMs: number;
  charCount: number;
};

export function sanitizeCounter(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export function sanitizeMetadata(m: AnswerMetadata, text: string): AnswerMetadata {
  return {
    pasteDetected: m.pasteDetected === true,
    pasteCount: sanitizeCounter(m.pasteCount),
    timeSpentMs: sanitizeCounter(m.timeSpentMs),
    // Derive character count from the persisted answer text, not the client payload.
    charCount: text.length,
  };
}
