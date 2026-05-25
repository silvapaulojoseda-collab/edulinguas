
-- Fix update_updated_at_column search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public/anon execute on security-definer helpers; allow authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_of(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teaches_turma(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_of(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_turma(UUID, UUID) TO authenticated;
