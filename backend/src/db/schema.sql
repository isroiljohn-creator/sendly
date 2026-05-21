-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Instagram Accounts Table
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_page_id TEXT UNIQUE NOT NULL,
  username TEXT,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER set_timestamp_instagram_accounts
BEFORE UPDATE ON instagram_accounts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 2. Automations Table
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  flow_data JSONB NOT NULL DEFAULT '{"blocks": []}'::jsonb,
  launch_count INTEGER DEFAULT 0,
  no_restart_seconds INTEGER DEFAULT 0,
  work_without_interruption BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER set_timestamp_automations
BEFORE UPDATE ON automations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 3. Automation Triggers
CREATE TYPE trigger_type_enum AS ENUM (
  'direct_message',
  'post_comment',
  'live_comment',
  'story_reaction',
  'story_reply',
  'story_mention',
  'successful_payment',
  'link_click'
);

CREATE TYPE sensitivity_enum AS ENUM (
  'any_message',
  'exact_match',
  'contains'
);

CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  trigger_type trigger_type_enum NOT NULL,
  sensitivity sensitivity_enum NOT NULL DEFAULT 'any_message',
  keywords TEXT[] DEFAULT '{}',
  post_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_triggers_automation_id ON automation_triggers(automation_id);


-- 4. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT,
  full_name TEXT,
  profile_picture TEXT,
  tags TEXT[] DEFAULT '{}',
  variables JSONB DEFAULT '{}'::jsonb,
  dialog_window_open BOOLEAN DEFAULT false,
  dialog_expires_at TIMESTAMP WITH TIME ZONE,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(account_id, instagram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_account_id_ig_user_id ON contacts(account_id, instagram_user_id);


-- 5. Automation Sessions
CREATE TYPE session_status_enum AS ENUM (
  'running',
  'waiting_delay',
  'completed',
  'stopped'
);

CREATE TABLE IF NOT EXISTS automation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  current_block_id TEXT,
  status session_status_enum NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  next_step_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_contact_id ON automation_sessions(contact_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON automation_sessions(status);


-- 6. Messages Log
CREATE TYPE message_direction_enum AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE message_type_enum AS ENUM (
  'text',
  'image',
  'video',
  'audio',
  'document',
  'button',
  'quick_reply'
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  direction message_direction_enum NOT NULL,
  content TEXT NOT NULL,
  message_type message_type_enum NOT NULL DEFAULT 'text',
  instagram_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);


-- 7. Automation Runs
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_contact_automation ON automation_runs(contact_id, automation_id);


-- 8. Tags Table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);


-- 9. Conversions Table
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversions_automation ON conversions(automation_id);


-- 10. Referral Links
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 11. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 12. Gamification Scores
CREATE TABLE IF NOT EXISTS gamification_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(contact_id, account_id)
);

CREATE TRIGGER set_timestamp_gamification_scores
BEFORE UPDATE ON gamification_scores
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 13. Analytics Daily
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_key TEXT DEFAULT '',
  value INTEGER DEFAULT 0,
  UNIQUE(account_id, date, metric_type, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(account_id, date);


-- 14. Broadcasts Table
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER set_timestamp_broadcasts
BEFORE UPDATE ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

