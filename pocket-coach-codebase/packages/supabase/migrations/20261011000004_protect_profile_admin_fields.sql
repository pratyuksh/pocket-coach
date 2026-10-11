-- PocketCoach Migration: Protect Admin-Managed Profile Fields
-- The "User or Admin update profiles" policy lets users update every column of their own row.
-- email (must stay in sync with auth.users), is_active (deactivation is Super-admin only) and
-- is_junior_coach (decides 14/18 track eligibility) are reserved for Super-admins.
-- RLS cannot restrict individual columns per role, so a trigger enforces it.

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Service-role / migration contexts (no JWT subject) and Super-admins are unrestricted
    IF auth.uid() IS NULL OR public.is_super_admin(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.is_junior_coach IS DISTINCT FROM OLD.is_junior_coach THEN
        RAISE EXCEPTION 'Only Super-admins can change email, active status, or the 14/18 Coach label'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();
