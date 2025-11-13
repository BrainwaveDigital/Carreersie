-- Add llm jsonb column to parsed_documents (idempotent)
ALTER TABLE public.parsed_documents
  ADD COLUMN IF NOT EXISTS llm jsonb;

-- You can run this in Supabase SQL editor or via psql as a DB admin.
