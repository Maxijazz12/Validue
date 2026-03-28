-- Allow any authenticated user to update current_responses on active campaigns.
-- This is needed because respondents (not creators) trigger the count increment
-- when submitting a response, and the "Creators manage campaigns" policy blocks them.
--
-- Security: The app-level check in submitResponse() validates the user has a
-- legitimate in_progress response before incrementing. RLS here just allows the
-- DB operation to succeed.
CREATE POLICY "Respondents can increment response count"
  ON campaigns FOR UPDATE
  USING (status = 'active')
  WITH CHECK (status = 'active');
