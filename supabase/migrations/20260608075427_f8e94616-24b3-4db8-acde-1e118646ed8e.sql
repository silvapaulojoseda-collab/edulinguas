
-- 1. user_roles SELECT policy
DROP POLICY IF EXISTS "user_roles select self or school" ON public.user_roles;
CREATE POLICY "user_roles select self or school"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_gestor_ou_coordenador(auth.uid(), escola_id)
  );

-- 2. professor_turmas SELECT policy
DROP POLICY IF EXISTS "professor_turmas select members" ON public.professor_turmas;
CREATE POLICY "professor_turmas select members"
  ON public.professor_turmas FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = professor_turmas.turma_id
        AND public.is_member_of(auth.uid(), t.escola_id)
    )
  );

-- 3. teacher_invites: column-level protection on token
REVOKE SELECT ON public.teacher_invites FROM authenticated;
GRANT SELECT (id, escola_id, email, nome, role, status, convidado_por, aceito_por, aceito_em, expira_em, created_at, updated_at)
  ON public.teacher_invites TO authenticated;

-- 4. cartoes-resposta storage: only gestor/coordenador can upload
DROP POLICY IF EXISTS "members upload cartoes files" ON storage.objects;
CREATE POLICY "staff upload cartoes files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cartoes-resposta'
    AND public.is_gestor_ou_coordenador(
      auth.uid(),
      (string_to_array(name, '/'))[1]::uuid
    )
  );
