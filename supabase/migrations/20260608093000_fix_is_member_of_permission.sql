GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_staff_of(uuid, uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.teaches_turma(uuid, uuid)
TO authenticated;