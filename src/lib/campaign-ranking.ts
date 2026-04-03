export function getRankingStatusAfterNewResponse(
  currentStatus: string | null | undefined
): "ranking" | "unranked" {
  return currentStatus === "ranking" ? "ranking" : "unranked";
}

export function getRankingStatusAfterRun(
  hasPendingSubmittedResponses: boolean
): "ranked" | "unranked" {
  return hasPendingSubmittedResponses ? "unranked" : "ranked";
}
