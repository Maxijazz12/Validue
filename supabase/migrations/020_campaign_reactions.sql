-- Quick emoji reactions on campaigns (fire, lightbulb, thumbsup, thinking)
CREATE TABLE campaign_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('fire', 'lightbulb', 'thumbsup', 'thinking')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_campaign_reaction UNIQUE (user_id, campaign_id, reaction_type)
);

CREATE INDEX idx_reactions_campaign ON campaign_reactions(campaign_id);

ALTER TABLE campaign_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads reactions on active campaigns"
  ON campaign_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_reactions.campaign_id AND status = 'active'));

CREATE POLICY "Users insert own reactions"
  ON campaign_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reactions"
  ON campaign_reactions FOR DELETE
  USING (user_id = auth.uid());
