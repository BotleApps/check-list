-- Diagnostic queries to understand the auth/user sync issue

-- 1. Check auth.users table
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  phone_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check public.users table  
SELECT 
  user_id,
  email,
  name,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Find mismatches (users in one table but not the other)
SELECT 
  'Missing in public.users' as issue,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL

UNION ALL

SELECT 
  'Missing in auth.users' as issue,
  pu.user_id,
  pu.email,
  pu.created_at
FROM public.users pu
LEFT JOIN auth.users au ON pu.user_id = au.id
WHERE au.id IS NULL;

-- 4. Check current RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';
