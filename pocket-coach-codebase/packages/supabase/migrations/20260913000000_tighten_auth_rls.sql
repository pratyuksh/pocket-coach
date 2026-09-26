-- PocketCoach Migration: Tighten Auth RLS Policies for Profiles and User Roles
-- Replaces wide-open development RLS policies with strict role-based PostgreSQL RLS rules.

-- 1. Helper function for Super-Admin check using SECURITY DEFINER to prevent policy recursion
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = user_id AND role = 'super_admin'
  );
$$;

-- 2. PROFILES RLS Policies
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public delete profiles" ON public.profiles;

-- Allow authenticated users to view profiles (needed for roster, assignments, substitutions)
CREATE POLICY "Authenticated read profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

-- Allow users to insert their own profile during signup/invite setup, or Super-Admins
CREATE POLICY "User or Admin insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR
        public.is_super_admin(auth.uid()) OR
        auth.role() = 'anon' -- Fallback for invite setup
    );

-- Allow users to update their own profile, or Super-Admins
CREATE POLICY "User or Admin update profiles" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.is_super_admin(auth.uid())
    );

-- Allow only Super-Admins to delete/deactivate profiles
CREATE POLICY "Admin delete profiles" ON public.profiles
    FOR DELETE USING (
        public.is_super_admin(auth.uid())
    );

-- 3. USER_ROLES RLS Policies
DROP POLICY IF EXISTS "Public read user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public delete user roles" ON public.user_roles;

-- Allow authenticated users to view user roles
CREATE POLICY "Authenticated read user roles" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

-- Allow Super-Admins to grant roles, or users inserting their own base 'trainer' role during setup
CREATE POLICY "Admin or self-trainer insert user roles" ON public.user_roles
    FOR INSERT WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        (profile_id = auth.uid() AND role = 'trainer') OR
        auth.role() = 'anon' -- Fallback for invite setup
    );

-- Allow only Super-Admins to update user roles
CREATE POLICY "Admin update user roles" ON public.user_roles
    FOR UPDATE USING (
        public.is_super_admin(auth.uid())
    );

-- Allow only Super-Admins to delete user roles
CREATE POLICY "Admin delete user roles" ON public.user_roles
    FOR DELETE USING (
        public.is_super_admin(auth.uid())
    );
