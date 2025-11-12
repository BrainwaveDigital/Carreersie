-- RLS test script: simulate users by setting jwt.claims.sub via set_config
-- Usage: run this in psql or Supabase SQL editor session-by-session. Replace UUIDs with desired test ids.

-- Example UUIDs (replace with generated UUIDs if you prefer)
-- user A will be owner, user B will be another user, adminUser is in app_admins
\echo 'Test RLS with simulated users'

-- You can generate UUIDs in Postgres with gen_random_uuid()
-- For clarity we'll create constants here by choosing values. Replace as needed.

-- Create 3 sample UUIDs (run once in a session)
-- SELECT gen_random_uuid();

-- Replace the values below with your chosen UUIDs if you want deterministic tests.
\set user_a '11111111-1111-1111-1111-111111111111'
\set user_b '22222222-2222-2222-2222-222222222222'
\set admin_user '33333333-3333-3333-3333-333333333333'

-- Insert admin user into app_admins
INSERT INTO public.app_admins (user_id) VALUES (:'admin_user') ON CONFLICT DO NOTHING;

-- Begin tests
BEGIN;

-- 1) As user A, set session claim and insert a profile
SELECT set_config('jwt.claims.sub', :'user_a', true);
INSERT INTO public.profiles (user_id, full_name, email) VALUES (current_setting('jwt.claims.sub', true)::uuid, 'Alice Example', 'alice@example.com') RETURNING id;

-- Grab the inserted profile id for later checks
\set profile_id ''''|| (SELECT id::text FROM public.profiles WHERE user_id = :'user_a' LIMIT 1) || ''''

-- 2) As user B, try to select profiles (should only see their own; no rows)
SELECT set_config('jwt.claims.sub', :'user_b', true);
-- Should return zero rows
SELECT id, user_id, full_name FROM public.profiles;

-- 3) As admin user, read profiles (should see all because admin is in app_admins)
SELECT set_config('jwt.claims.sub', :'admin_user', true);
SELECT id, user_id, full_name FROM public.profiles;

-- 4) As user B, attempt to insert experience for user A's profile (should be rejected by policy)
SELECT set_config('jwt.claims.sub', :'user_b', true);
-- This INSERT should fail due to RLS policy
INSERT INTO public.experiences (profile_id, title, company) VALUES (current_setting('jwt.claims.sub', true)::uuid, 'Hacker', 'Acme Inc');

-- 5) As user A, insert an experience for their profile (should succeed)
SELECT set_config('jwt.claims.sub', :'user_a', true);
INSERT INTO public.experiences (profile_id, title, company) VALUES ( (SELECT id FROM public.profiles WHERE user_id = current_setting('jwt.claims.sub', true)::uuid LIMIT 1), 'Engineer', 'Example Co') RETURNING id;

-- 6) As admin user, update user A's profile (should succeed)
SELECT set_config('jwt.claims.sub', :'admin_user', true);
UPDATE public.profiles SET headline = 'Admin updated headline' WHERE id = (SELECT id FROM public.profiles WHERE user_id = :'user_a' LIMIT 1);

-- 7) Clean up (optional) - only run if you want to delete test data
-- DELETE FROM public.experiences WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = :'user_a');
-- DELETE FROM public.profiles WHERE user_id = :'user_a';
-- DELETE FROM public.app_admins WHERE user_id = :'admin_user';

COMMIT;

-- End of tests
\echo 'RLS test script completed'
