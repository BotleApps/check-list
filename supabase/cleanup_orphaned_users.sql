-- Cleanup orphaned user records
-- Run this to clean up any users in public.users that don't exist in auth.users

-- First, let's see what we have
SELECT 
  u.user_id,
  u.email,
  u.name,
  au.id as auth_id,
  au.email as auth_email
FROM public.users u
FULL OUTER JOIN auth.users au ON u.user_id = au.id
WHERE u.user_id IS NULL OR au.id IS NULL;

-- Delete orphaned users (users in public.users but not in auth.users)
DELETE FROM public.users 
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Show remaining users
SELECT * FROM public.users;
