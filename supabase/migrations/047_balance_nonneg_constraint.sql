-- Prevent negative available balance at the DB level.
-- Application code already guards with WHERE clauses, but this catches raw SQL bypasses.
ALTER TABLE profiles
  ADD CONSTRAINT chk_available_balance_nonneg
  CHECK (available_balance_cents >= 0);
