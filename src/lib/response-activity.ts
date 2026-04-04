export type ResponseActivityTiming = {
  created_at: string | Date | null;
  submitted_duration_ms?: number | null;
};

function toNonNegativeDurationMs(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export function getResponseCompletedAt(
  row: ResponseActivityTiming
): Date | null {
  if (!row.created_at) return null;

  const createdAtMs = new Date(row.created_at).getTime();
  if (!Number.isFinite(createdAtMs)) return null;

  return new Date(createdAtMs + toNonNegativeDurationMs(row.submitted_duration_ms));
}

export function getResponseActivityDay(
  row: ResponseActivityTiming
): string | null {
  const completedAt = getResponseCompletedAt(row);
  if (!completedAt) return null;
  return completedAt.toISOString().slice(0, 10);
}

export function calculateCurrentResponseStreak(
  rows: ResponseActivityTiming[],
  now = new Date()
): number {
  const uniqueDays = [
    ...new Set(
      rows
        .map((row) => getResponseActivityDay(row))
        .filter((day): day is string => !!day)
    ),
  ]
    .sort()
    .reverse();

  if (uniqueDays.length === 0) return 0;

  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index++) {
    const previousDay = new Date(uniqueDays[index - 1]);
    const currentDay = new Date(uniqueDays[index]);
    const diffDays = Math.round(
      (previousDay.getTime() - currentDay.getTime()) / 86400000
    );

    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}
