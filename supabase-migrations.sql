-- First Mate: Database Migrations
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Add status column to scheduled_blocks (for pending/approved workflow)
ALTER TABLE scheduled_blocks
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- 2. Add Spotify token columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;

-- 3. Create sub_goals table (for Gantt chart decomposition)
CREATE TABLE IF NOT EXISTS sub_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC DEFAULT 1,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order INTEGER DEFAULT 0,
  depends_on UUID[] DEFAULT '{}',
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on sub_goals
ALTER TABLE sub_goals ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for sub_goals
CREATE POLICY "Users can view their own sub_goals" ON sub_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sub_goals" ON sub_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub_goals" ON sub_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub_goals" ON sub_goals
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_sub_goals_parent ON sub_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_sub_goals_user ON sub_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_status ON scheduled_blocks(status);
