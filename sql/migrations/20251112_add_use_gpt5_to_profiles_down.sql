-- Down migration: remove use_gpt5 column from profiles
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'use_gpt5'
	) THEN
		ALTER TABLE public.profiles DROP COLUMN use_gpt5;
	END IF;
END$$;
