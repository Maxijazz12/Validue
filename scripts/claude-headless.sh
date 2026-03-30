#!/bin/bash
# Headless Claude runner for Max plan (subscription-based, no API billing)
# Usage: ./scripts/claude-headless.sh "task description" [model] [effort]
#
# Examples:
#   ./scripts/claude-headless.sh "implement question randomization"
#   ./scripts/claude-headless.sh "refactor campaign creation flow" opus
#   ./scripts/claude-headless.sh "fix lint warning in wall-ranking" sonnet medium

set -euo pipefail

TASK="${1:?Usage: $0 \"task description\" [model] [effort]}"
MODEL="${2:-sonnet}"
EFFORT="${3:-high}"

# Derive fallback model
case "$MODEL" in
  opus)   FALLBACK="sonnet" ;;
  sonnet) FALLBACK="haiku" ;;
  *)      FALLBACK="sonnet" ;;
esac

# Session naming
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-30 | sed 's/-$//')
SESSION_NAME="auto-${SLUG}-${TIMESTAMP}"

# Logging
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGDIR="${SCRIPT_DIR}/../logs"
mkdir -p "$LOGDIR"
LOG="${LOGDIR}/${SESSION_NAME}.log"

# Retry config
MAX_RETRIES=5
WAIT=120
ATTEMPT=0
RATE_LIMIT_PATTERN='rate.limit|overloaded|429|too many requests|capacity|throttl|quota'

notify() {
  local title="$1" msg="$2" sound="${3:-Glass}"
  osascript -e "display notification \"$msg\" with title \"$title\" sound name \"$sound\"" 2>/dev/null || true
}

# Header
{
  echo "=== Claude Headless Task ==="
  echo "Task:     $TASK"
  echo "Model:    $MODEL (fallback: $FALLBACK)"
  echo "Effort:   $EFFORT"
  echo "Session:  $SESSION_NAME"
  echo "Started:  $(date)"
  echo "==========================="
} | tee "$LOG"

notify "VLDTA Claude" "Starting: ${TASK:0:50}..."

START_TIME=$(date +%s)
EXIT_CODE=1

while true; do
  set +e
  claude -p "[headless] $TASK" \
    --dangerously-skip-permissions \
    --model "$MODEL" \
    --fallback-model "$FALLBACK" \
    --effort "$EFFORT" \
    --name "$SESSION_NAME" \
    2>&1 | tee -a "$LOG"
  EXIT_CODE=${PIPESTATUS[0]}
  set -e

  if [ $EXIT_CODE -eq 0 ]; then
    break
  fi

  # Check if rate limited
  if tail -50 "$LOG" | grep -qiE "$RATE_LIMIT_PATTERN" && [ $ATTEMPT -lt $MAX_RETRIES ]; then
    ATTEMPT=$((ATTEMPT + 1))
    echo "" | tee -a "$LOG"
    echo ">>> Rate limited. Waiting ${WAIT}s before retry ${ATTEMPT}/${MAX_RETRIES}..." | tee -a "$LOG"
    notify "VLDTA Claude" "Rate limited. Retry ${ATTEMPT}/${MAX_RETRIES} in $((WAIT / 60))m" "Submarine"
    sleep $WAIT
    WAIT=$((WAIT * 2))
  else
    break
  fi
done

# Footer
END_TIME=$(date +%s)
DURATION=$(( (END_TIME - START_TIME) / 60 ))
{
  echo ""
  echo "=== Finished: $(date) (exit: $EXIT_CODE, ${DURATION}m, attempts: $((ATTEMPT + 1))) ==="
} | tee -a "$LOG"

if [ $EXIT_CODE -eq 0 ]; then
  notify "VLDTA Claude" "Done in ${DURATION}m: ${TASK:0:50}" "Glass"
else
  notify "VLDTA Claude" "Failed (exit $EXIT_CODE): ${TASK:0:50}" "Basso"
fi

exit $EXIT_CODE
