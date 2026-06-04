
-- =========================================================
-- 1. Rename is_staff_of -> is_gestor_ou_coordenador
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_gestor_ou_coordenador(_user_id uuid, _escola_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND escola_id = _escola_id
      AND role IN ('gestor','coordenador')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_gestor_ou_coordenador(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor_ou_coordenador(uuid, uuid) TO authenticated, service_role;

-- Drop all policies referencing is_staff_of and recreate using new function
-- profiles
DROP POLICY IF EXISTS "profile read" ON public.profiles;
CREATE POLICY "profile read" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (escola_ativa_id IS NOT NULL AND public.is_gestor_ou_coordenador(auth.uid(), escola_ativa_id)));

-- turmas
DROP POLICY IF EXISTS "staff manage turmas" ON public.turmas;
CREATE POLICY "gestcoord manage turmas" ON public.turmas FOR ALL TO authenticated
  USING (public.is_gestor_ou_coordenador(auth.uid(), escola_id))
  WITH CHECK (public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- professor_turmas
DROP POLICY IF EXISTS "staff manage professor_turmas" ON public.professor_turmas;
CREATE POLICY "gestcoord manage professor_turmas" ON public.professor_turmas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = professor_turmas.turma_id
      AND public.is_gestor_ou_coordenador(auth.uid(), t.escola_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = professor_turmas.turma_id
      AND public.is_gestor_ou_coordenador(auth.uid(), t.escola_id)));

-- alunos
DROP POLICY IF EXISTS "staff manage alunos" ON public.alunos;
DROP POLICY IF EXISTS "read alunos" ON public.alunos;
CREATE POLICY "read alunos" ON public.alunos FOR SELECT TO authenticated
  USING (escola_id IS NOT NULL AND (
    public.is_gestor_ou_coordenador(auth.uid(), escola_id)
    OR EXISTS (SELECT 1 FROM public.professor_turmas pt WHERE pt.user_id = auth.uid() AND pt.turma_id = alunos.turma_id)
  ));
CREATE POLICY "gestcoord manage alunos" ON public.alunos FOR ALL TO authenticated
  USING (escola_id IS NOT NULL AND public.is_gestor_ou_coordenador(auth.uid(), escola_id))
  WITH CHECK (escola_id IS NOT NULL AND public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- avaliacoes
DROP POLICY IF EXISTS "staff manage avaliacoes" ON public.avaliacoes;
CREATE POLICY "gestcoord manage avaliacoes" ON public.avaliacoes FOR ALL TO authenticated
  USING (public.is_gestor_ou_coordenador(auth.uid(), escola_id))
  WITH CHECK (public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- gabaritos
DROP POLICY IF EXISTS "staff manage gabaritos" ON public.gabaritos;
CREATE POLICY "gestcoord manage gabaritos" ON public.gabaritos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = gabaritos.avaliacao_id
    AND public.is_gestor_ou_coordenador(auth.uid(), a.escola_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = gabaritos.avaliacao_id
    AND public.is_gestor_ou_coordenador(auth.uid(), a.escola_id)));

-- lotes_ocr
DROP POLICY IF EXISTS "owner staff update lotes" ON public.lotes_ocr;
DROP POLICY IF EXISTS "staff delete lotes" ON public.lotes_ocr;
CREATE POLICY "owner gestcoord update lotes" ON public.lotes_ocr FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.is_gestor_ou_coordenador(auth.uid(), escola_id));
CREATE POLICY "gestcoord delete lotes" ON public.lotes_ocr FOR DELETE TO authenticated
  USING (public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- cartoes_ocr (recreate the staff ones)
DROP POLICY IF EXISTS "staff insert cartoes" ON public.cartoes_ocr;
DROP POLICY IF EXISTS "staff update cartoes" ON public.cartoes_ocr;
DROP POLICY IF EXISTS "staff delete cartoes" ON public.cartoes_ocr;
CREATE POLICY "gestcoord insert cartoes" ON public.cartoes_ocr FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lotes_ocr l
    WHERE l.id = cartoes_ocr.lote_id AND public.is_gestor_ou_coordenador(auth.uid(), l.escola_id)));
CREATE POLICY "gestcoord update cartoes" ON public.cartoes_ocr FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lotes_ocr l
    WHERE l.id = cartoes_ocr.lote_id AND public.is_gestor_ou_coordenador(auth.uid(), l.escola_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lotes_ocr l
    WHERE l.id = cartoes_ocr.lote_id AND public.is_gestor_ou_coordenador(auth.uid(), l.escola_id)));
CREATE POLICY "gestcoord delete cartoes" ON public.cartoes_ocr FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lotes_ocr l
    WHERE l.id = cartoes_ocr.lote_id AND public.is_gestor_ou_coordenador(auth.uid(), l.escola_id)));

-- audit_logs
DROP POLICY IF EXISTS "staff read audit" ON public.audit_logs;
CREATE POLICY "gestcoord read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (escola_id IS NOT NULL AND public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- Storage policies (cartoes-resposta)
DROP POLICY IF EXISTS "staff delete cartoes files" ON storage.objects;
DROP POLICY IF EXISTS "staff update cartoes files" ON storage.objects;
CREATE POLICY "gestcoord delete cartoes files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cartoes-resposta' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord update cartoes files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cartoes-resposta' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'cartoes-resposta' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- reports bucket
DROP POLICY IF EXISTS "staff read reports" ON storage.objects;
DROP POLICY IF EXISTS "staff write reports" ON storage.objects;
DROP POLICY IF EXISTS "staff delete reports" ON storage.objects;
CREATE POLICY "gestcoord read reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord write reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord update reports" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reports' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'reports' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord delete reports" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- school-assets bucket
DROP POLICY IF EXISTS "members read school-assets" ON storage.objects;
DROP POLICY IF EXISTS "staff write school-assets" ON storage.objects;
DROP POLICY IF EXISTS "staff delete school-assets" ON storage.objects;
CREATE POLICY "members read school-assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'school-assets' AND public.is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord write school-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'school-assets' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord update school-assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'school-assets' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'school-assets' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord delete school-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'school-assets' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- qr-templates bucket
DROP POLICY IF EXISTS "members read qr-templates" ON storage.objects;
DROP POLICY IF EXISTS "staff write qr-templates" ON storage.objects;
DROP POLICY IF EXISTS "staff delete qr-templates" ON storage.objects;
CREATE POLICY "members read qr-templates" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'qr-templates' AND public.is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord write qr-templates" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr-templates' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord update qr-templates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'qr-templates' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'qr-templates' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "gestcoord delete qr-templates" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qr-templates' AND public.is_gestor_ou_coordenador(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- Drop the old function
DROP FUNCTION IF EXISTS public.is_staff_of(uuid, uuid) CASCADE;

-- =========================================================
-- 2. pareceres_ia: restringir INSERT a gestor/coordenador
-- =========================================================
DROP POLICY IF EXISTS "members write pareceres" ON public.pareceres_ia;
CREATE POLICY "gestcoord write pareceres" ON public.pareceres_ia FOR INSERT TO authenticated
  WITH CHECK (public.is_gestor_ou_coordenador(auth.uid(), escola_id));

-- =========================================================
-- 3. user_roles: trigger anti-tamper para impedir alteração de
-- user_id / escola_id e promoção a gestor via UPDATE bypass
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_roles_no_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id imutável em user_roles';
  END IF;
  IF NEW.escola_id <> OLD.escola_id THEN
    RAISE EXCEPTION 'escola_id imutável em user_roles';
  END IF;
  IF NEW.role = 'gestor'::app_role AND OLD.role <> 'gestor'::app_role THEN
    RAISE EXCEPTION 'Promoção a gestor só é permitida via service role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_no_tamper ON public.user_roles;
CREATE TRIGGER trg_user_roles_no_tamper
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.user_roles_no_tamper();
