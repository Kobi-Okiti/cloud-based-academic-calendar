-- Patch: lock down profile updates and add safe RPC

-- Remove open update policy
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Safe profile update RPC (prevents role/status escalation)
CREATE OR REPLACE FUNCTION public.update_profile(
  p_full_name text,
  p_role role_type,
  p_level int,
  p_department text,
  p_matric_number text,
  p_staff_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role NOT IN ('student', 'staff') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF p_role = 'student' AND p_level IS NOT NULL AND p_level NOT IN (100, 200, 300, 400, 500) THEN
    RAISE EXCEPTION 'Invalid level';
  END IF;

  UPDATE profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    role = p_role,
    level = CASE WHEN p_role = 'student' THEN p_level ELSE NULL END,
    department = COALESCE(p_department, department),
    matric_number = CASE WHEN p_role = 'student' THEN p_matric_number ELSE NULL END,
    staff_id = CASE WHEN p_role = 'staff' THEN p_staff_id ELSE NULL END
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile(
  text,
  role_type,
  int,
  text,
  text,
  text
) TO authenticated;
