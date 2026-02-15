-- First Mate: AEIOU + Islands migration
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/bhpquyvbqklytjxsykxv/sql

-- AEIOU Responses table
CREATE TABLE IF NOT EXISTS aeiou_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  activities TEXT NOT NULL,
  environments TEXT NOT NULL,
  interactions TEXT NOT NULL,
  objects TEXT NOT NULL,
  users_present TEXT NOT NULL,
  excitement_level TEXT DEFAULT '',
  peak_moments TEXT DEFAULT '',
  ai_assessment TEXT,
  was_successful BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE aeiou_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "aeiou_select" ON aeiou_responses FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "aeiou_insert" ON aeiou_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "aeiou_delete" ON aeiou_responses FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new engagement columns if table already exists (safe to re-run)
ALTER TABLE aeiou_responses ADD COLUMN IF NOT EXISTS excitement_level TEXT DEFAULT '';
ALTER TABLE aeiou_responses ADD COLUMN IF NOT EXISTS peak_moments TEXT DEFAULT '';

-- Islands table (now represents planets in the solar system)
CREATE TABLE IF NOT EXISTS islands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  aeiou_response_id UUID REFERENCES aeiou_responses(id) ON DELETE SET NULL,
  island_type TEXT NOT NULL DEFAULT 'tropical',
  color_palette JSONB NOT NULL DEFAULT '["#4ECDC4","#45B7D1","#96CEB4"]',
  name TEXT NOT NULL,
  position_theta FLOAT DEFAULT 0,
  position_phi FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE islands ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "islands_select" ON islands FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "islands_insert" ON islands FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "islands_delete" ON islands FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
