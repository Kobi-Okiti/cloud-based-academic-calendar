-- Patch: enforce required profile fields in update_profile

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

  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF p_department IS NULL OR length(trim(p_department)) < 2 THEN
    RAISE EXCEPTION 'Department is required';
  END IF;

  IF p_role = 'student' THEN
    IF p_level IS NULL OR p_level NOT IN (100, 200, 300, 400, 500) THEN
      RAISE EXCEPTION 'Invalid level';
    END IF;

    IF p_matric_number IS NULL OR length(trim(p_matric_number)) < 1 THEN
      RAISE EXCEPTION 'Matric number is required';
    END IF;
  END IF;

  IF p_role = 'staff' THEN
    IF p_staff_id IS NULL OR length(trim(p_staff_id)) < 1 THEN
      RAISE EXCEPTION 'Staff ID is required';
    END IF;
  END IF;

  UPDATE profiles
  SET
    full_name = trim(p_full_name),
    role = p_role,
    level = CASE WHEN p_role = 'student' THEN p_level ELSE NULL END,
    department = trim(p_department),
    matric_number = CASE WHEN p_role = 'student' THEN trim(p_matric_number) ELSE NULL END,
    staff_id = CASE WHEN p_role = 'staff' THEN trim(p_staff_id) ELSE NULL END
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
