-- Up migration: add use_gpt5 boolean flag to profiles (postgres-safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'use_gpt5'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN use_gpt5 boolean DEFAULT false;
  END IF;
END$$;

-- Backfill: keep default false (admins can opt-in users)
UPDATE public.profiles SET use_gpt5 = false WHERE use_gpt5 IS NULL;
