-- Campaign comments: one "take" per user per campaign
CREATE TABLE campaign_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT content_length CHECK (length(content) > 0 AND length(content) <= 500)
);

-- One comment per user per campaign
ALTER TABLE campaign_comments
  ADD CONSTRAINT unique_author_campaign UNIQUE (author_id, campaign_id);

CREATE INDEX idx_campaign_comments_campaign ON campaign_comments(campaign_id);
CREATE INDEX idx_campaign_comments_created ON campaign_comments(created_at DESC);

-- RLS
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments on active campaigns"
  ON campaign_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns WHERE id = campaign_comments.campaign_id AND status = 'active'
  ));

CREATE POLICY "Authenticated users can insert own comments"
  ON campaign_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON campaign_comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON campaign_comments FOR DELETE
  USING (author_id = auth.uid());
