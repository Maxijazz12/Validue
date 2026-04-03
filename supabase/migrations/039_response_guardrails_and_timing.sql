-- Server-derived response timing for qualification / payout decisions.
ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS submitted_duration_ms integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responses_submitted_duration_ms_nonnegative'
  ) THEN
    ALTER TABLE responses
      ADD CONSTRAINT responses_submitted_duration_ms_nonnegative
      CHECK (submitted_duration_ms IS NULL OR submitted_duration_ms >= 0);
  END IF;
END $$;

-- Backfill existing responses from stored answer metadata so older data keeps
-- its current qualification behavior until it is resubmitted.
WITH answer_durations AS (
  SELECT
    a.response_id,
    GREATEST(
      0,
      COALESCE(
        SUM(
          CASE
            WHEN jsonb_typeof(a.metadata -> 'timeSpentMs') = 'number' THEN GREATEST(0, FLOOR((a.metadata ->> 'timeSpentMs')::numeric))
            WHEN jsonb_typeof(a.metadata -> 'timeSpentMs') = 'string'
              AND (a.metadata ->> 'timeSpentMs') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN GREATEST(0, FLOOR((a.metadata ->> 'timeSpentMs')::numeric))
            ELSE 0
          END
        )::integer,
        0
      )
    ) AS total_time_ms
  FROM answers a
  GROUP BY a.response_id
)
UPDATE responses r
SET submitted_duration_ms = ad.total_time_ms
FROM answer_durations ad
WHERE r.id = ad.response_id
  AND r.submitted_duration_ms IS NULL;

-- Block answer writes that target questions outside the response campaign or
-- outside the respondent's assigned partial-response question set.
CREATE OR REPLACE FUNCTION public.validate_answer_question_alignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_campaign_id uuid;
  response_is_partial boolean;
  response_assigned_question_ids uuid[];
  question_campaign_id uuid;
BEGIN
  SELECT campaign_id, is_partial, assigned_question_ids
  INTO response_campaign_id, response_is_partial, response_assigned_question_ids
  FROM responses
  WHERE id = NEW.response_id;

  IF response_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Response % not found for answer write', NEW.response_id;
  END IF;

  SELECT campaign_id
  INTO question_campaign_id
  FROM questions
  WHERE id = NEW.question_id;

  IF question_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Question % not found for answer write', NEW.question_id;
  END IF;

  IF question_campaign_id <> response_campaign_id THEN
    RAISE EXCEPTION 'Question % does not belong to response % campaign', NEW.question_id, NEW.response_id;
  END IF;

  IF response_is_partial THEN
    IF COALESCE(array_length(response_assigned_question_ids, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Partial response % has no assigned questions', NEW.response_id;
    END IF;

    IF NOT (NEW.question_id = ANY(response_assigned_question_ids)) THEN
      RAISE EXCEPTION 'Question % is not assigned to partial response %', NEW.question_id, NEW.response_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_answer_question_alignment ON answers;

CREATE TRIGGER trg_validate_answer_question_alignment
BEFORE INSERT OR UPDATE OF response_id, question_id
ON answers
FOR EACH ROW
EXECUTE FUNCTION public.validate_answer_question_alignment();

-- Cashout retries need a distinct, deterministic Stripe idempotency key per
-- retry attempt so ambiguous failures can't create duplicate transfers.
ALTER TABLE cashouts
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
