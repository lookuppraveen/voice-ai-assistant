-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Test Company (Used for migrating existing users)
INSERT INTO companies (id, name)
SELECT '00000000-0000-0000-0000-000000000000', 'Test Company'
WHERE NOT EXISTS (
  SELECT id FROM companies WHERE id = '00000000-0000-0000-0000-000000000000'
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'candidate',
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add company_id if table existed before and update existing users
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_id') THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE users SET company_id = '00000000-0000-0000-0000-000000000000' WHERE company_id IS NULL;
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;

-- Drop old check constraint if it exists and add new one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('candidate', 'supervisor', 'admin', 'company_admin', 'system_admin'));

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  scenario_type VARCHAR(100) NOT NULL DEFAULT 'cold_call',
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  duration_seconds INTEGER,
  ai_feedback TEXT,
  improvement_suggestions JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add topic_id to sessions if it already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='topic_id') THEN
    ALTER TABLE sessions ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Messages table (conversation turns)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url VARCHAR(500),
  turn_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session scores breakdown table
CREATE TABLE IF NOT EXISTS score_breakdowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  objection_handling_score INTEGER CHECK (objection_handling_score >= 0 AND objection_handling_score <= 100),
  closing_technique_score INTEGER CHECK (closing_technique_score >= 0 AND closing_technique_score <= 100),
  product_knowledge_score INTEGER CHECK (product_knowledge_score >= 0 AND product_knowledge_score <= 100),
  rapport_score INTEGER CHECK (rapport_score >= 0 AND rapport_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_turn_number ON messages(session_id, turn_number);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- System Settings (Global)
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default settings
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('tts_provider', 'elevenlabs')
ON CONFLICT (setting_key) DO NOTHING;
