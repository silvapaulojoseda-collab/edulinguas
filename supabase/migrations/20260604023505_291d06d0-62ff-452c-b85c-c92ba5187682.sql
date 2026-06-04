
REVOKE EXECUTE ON FUNCTION public.user_roles_no_tamper() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gestor_ou_coordenador(uuid, uuid) FROM authenticated;
-- keep service_role only; policies run as the row owner via SECURITY DEFINER without needing EXECUTE for the caller in RLS contexts
GRANT EXECUTE ON FUNCTION public.is_gestor_ou_coordenador(uuid, uuid) TO service_role;
