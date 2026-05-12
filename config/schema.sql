-- ============================================
-- ONLINE RESUME BUILDER - PostgreSQL Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar VARCHAR(500),
  phone VARCHAR(20),
  location VARCHAR(100),
  website VARCHAR(200),
  linkedin VARCHAR(200),
  github VARCHAR(200),
  portfolio VARCHAR(200),
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  reset_password_token VARCHAR(255),
  reset_password_expire TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  thumbnail VARCHAR(500),
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'My Resume',
  slug VARCHAR(300) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  share_token VARCHAR(100) UNIQUE,
  theme_color VARCHAR(20) DEFAULT '#3B82F6',
  font_family VARCHAR(50) DEFAULT 'Inter',
  language VARCHAR(20) DEFAULT 'en',
  ats_score INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  personal_info JSONB DEFAULT '{}',
  career_objective TEXT,
  education JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  projects JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  workshops JSONB DEFAULT '[]',
  internships JSONB DEFAULT '[]',
  publications JSONB DEFAULT '[]',
  custom_sections JSONB DEFAULT '[]',
  section_order JSONB DEFAULT '["personal_info","career_objective","experience","education","skills","projects","certifications","achievements","languages","interests"]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Resume Versions Table
CREATE TABLE IF NOT EXISTS resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'download', 'share_visit', 'pdf_export')),
  ip_address VARCHAR(50),
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  condition_type VARCHAR(50),
  condition_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Insert Default Templates
INSERT INTO templates (name, slug, description, is_premium) VALUES
  ('Modern', 'modern', 'Clean and modern design with accent colors', false),
  ('Minimal', 'minimal', 'Simple and elegant minimal layout', false),
  ('Corporate', 'corporate', 'Professional corporate style', false),
  ('Creative', 'creative', 'Bold creative design for creative professionals', false)
ON CONFLICT (slug) DO NOTHING;

-- Insert Default Badges
INSERT INTO badges (name, description, icon, condition_type, condition_value) VALUES
  ('Profile Complete', 'Complete your profile 100%', '🏆', 'profile_complete', 100),
  ('First Resume', 'Create your first resume', '📄', 'resume_count', 1),
  ('ATS Master', 'Achieve ATS score above 80', '🎯', 'ats_score', 80),
  ('Popular Resume', 'Get 100 resume views', '👁️', 'view_count', 100),
  ('Download King', 'Download resume 10 times', '⬇️', 'download_count', 10)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_share_token ON resumes(share_token);
CREATE INDEX IF NOT EXISTS idx_analytics_resume_id ON analytics(resume_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
