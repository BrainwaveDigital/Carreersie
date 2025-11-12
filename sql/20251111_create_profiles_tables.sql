-- Migration: create profiles and resume parsing related tables
-- Date: 2025-11-11
-- Intended for: Supabase (Postgres). Run in SQL editor or via psql/supabase CLI.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  full_name text,
  preferred_name text,
  headline text,
  summary text,
  location text,
  website text,
  email text,
  phone text,
  about text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- parsed_documents (one row per uploaded CV)
CREATE TABLE IF NOT EXISTS public.parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id),
  user_id uuid REFERENCES auth.users(id),
  file_name text,
  storage_path text,
  content_type text,
  size_bytes integer,
  text_extracted text,
  parsed_json jsonb,
  parser_version text,
  status text DEFAULT 'uploaded', -- uploaded|parsing|parsed|failed
  error_text text,
  parsed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- experiences
CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  company text,
  location text,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  raw_json jsonb,
  order_index integer,
  created_at timestamptz DEFAULT now()
);

-- education
CREATE TABLE IF NOT EXISTS public.education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school text,
  degree text,
  field_of_study text,
  start_year integer,
  end_year integer,
  description text,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- skills
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill text,
  confidence numeric(5,4),
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- certifications (optional)
CREATE TABLE IF NOT EXISTS public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  authority text,
  issued_date date,
  expiry_date date,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- parsing_jobs (optional queue for async parsing)
CREATE TABLE IF NOT EXISTS public.parsing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parsed_document_id uuid REFERENCES public.parsed_documents(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- pending|running|done|failed
  attempts integer DEFAULT 0,
  worker text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- projects (optional)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  authority text,
  issued_date date,
  expiry_date date,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- volunteering (optional)
CREATE TABLE IF NOT EXISTS public.volunteering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  authority text,
  issued_date date,
  expiry_date date,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- languages (optional)
CREATE TABLE IF NOT EXISTS public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  language text,
  proficiency text,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- organizations (optional)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  authority text,
  issued_date date,
  expiry_date date,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_parsed_documents_status ON public.parsed_documents (status);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_json_gin ON public.parsed_documents USING GIN (parsed_json);
CREATE INDEX IF NOT EXISTS idx_experiences_profile ON public.experiences (profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile ON public.skills (profile_id);

-- Full-text search helper (optional): add a tsvector column and index as needed in a later migration

-- Notes:
-- 1) Consider enabling Row Level Security (RLS) on tables that store user data and adding policies
--    to allow owners (profiles.user_id or parsed_documents.user_id) to access their own rows.
-- 2) To run: paste this file into Supabase SQL editor or run with psql connected to your Supabase DB.
-- Migration applied in Supabase
-- Date applied: 2025-11-12
-- The SQL statements that created the profiles / parsed_documents / experiences / education
-- /skills /certifications /parsing_jobs /projects /volunteering /languages /organizations
-- tables were executed directly in the Supabase dashboard. The body of this file has been
-- cleared to avoid accidental re-application. The original SQL is available in the Git history
-- (commit where this file was first added).

-- If you need the original SQL restored here for CI or migration tooling, tell me and I will
-- add a reversible migration or separate up/down files.

-- -------------------------
-- Row Level Security (RLS) policies (owner-only access)
-- -------------------------
-- The policies below restrict access so that only the owner (user_id = auth.uid())
-- can SELECT/INSERT/UPDATE/DELETE their rows. Supabase service role keys bypass RLS
-- so server-side processes can perform administrative operations.

-- Enable RLS and create basic owner policies for `profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "profiles_owner_or_admin_full_access" ON public.profiles
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- parsed_documents: only owner can manage their uploaded documents
ALTER TABLE public.parsed_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "parsed_documents_owner_or_admin_full_access" ON public.parsed_documents
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- experiences: allow access only when the associated profile belongs to the current user
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "experiences_profile_owner_or_admin" ON public.experiences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.experiences.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.experiences.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- education
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "education_profile_owner_or_admin" ON public.education
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.education.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.education.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "skills_profile_owner_or_admin" ON public.skills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.skills.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.skills.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- certifications
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "certifications_profile_owner_or_admin" ON public.certifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.certifications.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.certifications.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "projects_profile_owner_or_admin" ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.projects.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.projects.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- volunteering
ALTER TABLE public.volunteering ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "volunteering_profile_owner_or_admin" ON public.volunteering
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.volunteering.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.volunteering.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- languages
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "languages_profile_owner_or_admin" ON public.languages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.languages.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.languages.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "organizations_profile_owner_or_admin" ON public.organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.organizations.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.organizations.profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- parsing_jobs: allow owners to view jobs related to their documents
ALTER TABLE public.parsing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "parsing_jobs_owner_or_admin" ON public.parsing_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.parsed_documents d
      WHERE d.id = public.parsing_jobs.parsed_document_id AND d.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parsed_documents d
      WHERE d.id = public.parsing_jobs.parsed_document_id AND d.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
  );

-- -------------------------
-- Admins table to list users allowed admin privileges (used by RLS policies above)
-- Add rows to this table with admin user UUIDs as needed.
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Helpful note: to allow read-only public access for certain fields, add a specific SELECT policy.

