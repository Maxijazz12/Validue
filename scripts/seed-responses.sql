-- ============================================================
-- Seed script: fake responses with distinct personalities
-- ============================================================
-- USAGE:
--   1. Create a campaign through the app (idea → draft → publish)
--   2. Copy the campaign_id from the URL: /dashboard/ideas/<CAMPAIGN_ID>
--   3. Replace '<CAMPAIGN_ID>' below with your real campaign ID
--   4. Run in Supabase SQL Editor
--   5. Go to the campaign page → Rank → then view the Brief
-- ============================================================

-- Set your campaign ID here
DO $$
DECLARE
  v_campaign_id uuid := '<CAMPAIGN_ID>';  -- ← REPLACE THIS
  v_questions   record;
  v_q_ids       uuid[];
  v_q_texts     text[];
  v_q_baselines boolean[];
  v_q_categories text[];
  v_resp_id     uuid;
  v_profile_id  uuid;
  v_i           int;
BEGIN

  -- Collect all questions for the campaign (ordered)
  SELECT
    array_agg(id ORDER BY sort_order),
    array_agg(text ORDER BY sort_order),
    array_agg(COALESCE(is_baseline, false) ORDER BY sort_order),
    array_agg(COALESCE(category, 'custom') ORDER BY sort_order)
  INTO v_q_ids, v_q_texts, v_q_baselines, v_q_categories
  FROM questions
  WHERE campaign_id = v_campaign_id;

  IF v_q_ids IS NULL THEN
    RAISE EXCEPTION 'No questions found for campaign %', v_campaign_id;
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 1: The Enthusiast
  -- Has the problem badly, already spending money, wants to switch
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Enthusiast') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Every week — I''m constantly looking for something better. I tried three different tools this month alone. Nothing sticks because they all feel like they were built for enterprises, not solo founders.'
        WHEN 'price' THEN 'I''m currently paying $29/month for a tool that does maybe 30% of what I need. I''d easily pay $15-25/month for something that actually works. Already spending more than that on workarounds.'
        WHEN 'behavior' THEN 'Right now I use a messy combination of Notion, spreadsheets, and asking friends. Takes me about 3 hours every time I want to validate something. I do this at least twice a month.'
        WHEN 'pain' THEN 'Last week I spent an entire Saturday building a survey, sending it to 50 people, and getting 3 useless responses back. I nearly scrapped my whole idea because I couldn''t tell if the feedback was real or polite.'
        ELSE 'This is exactly the problem I have. I''ve been trying to validate my startup idea for months and every approach feels like guessing. I would use this immediately if it existed.'
      END,
      '{"timeSpentMs": 52000, "charCount": 180, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 2: The Skeptic
  -- Sees the problem but doubts the solution, price-sensitive
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Skeptic') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Maybe a few times a year? Honestly the problem exists but I''m not sure another tool is the answer. Most validation tools I''ve seen are just glorified survey builders.'
        WHEN 'price' THEN 'I only use free tools. $0. I''d need to see serious proof this works before paying anything. Maybe $5/month max if it genuinely saved me time, but I''m skeptical.'
        WHEN 'behavior' THEN 'I just ask people I know. It''s not rigorous but it''s free and fast. I don''t think I need a tool for this — I need better judgment about what to build.'
        WHEN 'pain' THEN 'It''s annoying but not painful enough that I''d pay to fix it. I usually just make a decision and move on. The real pain is building the wrong thing, not the validation process itself.'
        ELSE 'I get why someone would want this but I''m not convinced it would change my decisions. I''d probably try it if free but I wouldn''t rely on it for major calls.'
      END,
      '{"timeSpentMs": 31000, "charCount": 140, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 3: The Power User
  -- Deep problem awareness, specific needs, willing to pay
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Power User') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Weekly. I run assumption tests before every sprint. Currently I use a mix of Typeform + manual analysis in Sheets. The analysis part is what kills me — collecting is easy, interpreting is hard.'
        WHEN 'price' THEN 'I spend about $400/year across Typeform ($35/mo), UserTesting credits, and the occasional Respondent.io session. I''d consolidate to $30-40/month for something that handles the full loop from assumptions to verdict.'
        WHEN 'behavior' THEN 'Typeform for surveys, Calendly for interviews, Sheets for tracking assumptions, Notion for the synthesis. It works but it''s 4 tools duct-taped together. I spend more time on process than insight.'
        WHEN 'pain' THEN 'Two months ago I launched a feature based on survey data that said 80% of users wanted it. Turns out they wanted the idea of it, not the actual thing. Cost us 6 weeks of dev time. The problem is turning responses into honest signal.'
        ELSE 'The gap in the market is clear: there''s no tool that goes from "here''s my assumption" to "here''s whether it''s true, with evidence." Everything stops at data collection and leaves synthesis to you.'
      END,
      '{"timeSpentMs": 67000, "charCount": 220, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 4: The Outsider
  -- Doesn't really have the problem, provides contrast signal
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Outsider') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Rarely or never. I don''t really think about this. When I have an idea I just start building and see what happens. Validation feels like procrastination to me.'
        WHEN 'price' THEN '$0. I wouldn''t pay for this. If I needed feedback I''d post on Reddit or ask in a Discord. There are enough free ways to get opinions.'
        WHEN 'behavior' THEN 'Nothing — I just deal with it. I talk to a few friends, maybe post in a Slack group. I don''t see this as a problem that needs a dedicated tool.'
        WHEN 'pain' THEN 'Not painful at all. I''ve never felt like I needed to formally validate anything. Most of my projects are side projects so the stakes are low.'
        ELSE 'I don''t think I''m the target user for this. I can see how someone more serious about startups might want it but it''s not for me.'
      END,
      '{"timeSpentMs": 22000, "charCount": 95, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 5: The Contradictory One
  -- Says they want it but behavior doesn't match (consistency gap signal)
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Contradictory') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Oh definitely, I think about this all the time! I would absolutely love a tool that helps me validate ideas. It''s super important to me. I''ve been meaning to look into this for ages.'
        WHEN 'price' THEN 'I''d pay $50/month easily, maybe more! This is really valuable. Though I guess I haven''t actually spent anything on it yet. I''ve been using free stuff and it''s been... fine, actually.'
        WHEN 'behavior' THEN 'I don''t currently use anything for this. I keep meaning to set up a proper process but haven''t gotten around to it. I''ve bookmarked a few tools but never signed up.'
        WHEN 'pain' THEN 'It''s a huge problem! Well, I mean, I haven''t actually lost money or time because of it specifically. But I''m sure I would if I was further along. It''s more of a future concern I guess.'
        ELSE 'Yes this is exactly what I need! I''d sign up today. Well, I''d want to try it first. And I''d need to see how it compares to just asking people myself. But conceptually I love it.'
      END,
      '{"timeSpentMs": 28000, "charCount": 160, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- ════════════════════════════════════════════════════════════
  -- PERSONA 6: The Budget-Conscious Builder
  -- Real problem, would use it, but very price-sensitive
  -- ════════════════════════════════════════════════════════════
  INSERT INTO profiles (id, display_name) VALUES (gen_random_uuid(), 'Seed – Budget Builder') RETURNING id INTO v_profile_id;
  INSERT INTO responses (campaign_id, respondent_id, status) VALUES (v_campaign_id, v_profile_id, 'submitted') RETURNING id INTO v_resp_id;
  FOR v_i IN 1..array_length(v_q_ids, 1) LOOP
    INSERT INTO answers (response_id, question_id, text, metadata) VALUES (
      v_resp_id, v_q_ids[v_i],
      CASE v_q_categories[v_i]
        WHEN 'willingness' THEN 'Every couple of weeks. I''m a student building my first real project. I know I should validate before building but every tool I find is priced for funded startups, not broke students.'
        WHEN 'price' THEN 'Honestly, under $10/month is my max. I''m bootstrapping everything. I''d prefer a free tier that covers 1-2 campaigns per month. If it proves itself I''d upgrade but I need to see ROI first.'
        WHEN 'behavior' THEN 'Google Forms and Instagram polls. It''s terrible — I get responses from friends who just tell me what I want to hear. I know the data is bad but I can''t afford proper tools.'
        WHEN 'pain' THEN 'I built an entire MVP last semester based on classmate feedback. Turns out nobody outside my university cared. That was 3 months of work. I need honest signal but can''t afford to pay much for it.'
        ELSE 'I''m exactly the person who needs this. Student founder, pre-revenue, no budget for UserTesting or formal research. If the price is right I''d use it for every project.'
      END,
      '{"timeSpentMs": 44000, "charCount": 175, "pasteDetected": false, "pasteCount": 0}'::jsonb
    );
  END LOOP;

  -- Update campaign response count
  UPDATE campaigns SET response_count = response_count + 6 WHERE id = v_campaign_id;

  RAISE NOTICE 'Seeded 6 responses for campaign %', v_campaign_id;
END $$;
