
-- ============== TRIGGER updated_at em lotes_ocr (já tem coluna) ==============
DROP TRIGGER IF EXISTS trg_lotes_ocr_updated_at ON public.lotes_ocr;
CREATE TRIGGER trg_lotes_ocr_updated_at
BEFORE UPDATE ON public.lotes_ocr
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Índices ==============
CREATE INDEX IF NOT EXISTS idx_alunos_escola ON public.alunos(escola_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON public.alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_lote ON public.cartoes_ocr(lote_id);
CREATE INDEX IF NOT EXISTS idx_respostas_cartao ON public.respostas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_lotes_escola ON public.lotes_ocr(escola_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_escola ON public.avaliacoes(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_escola ON public.turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_escola ON public.user_roles(escola_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_pareceres_escola ON public.pareceres_ia(escola_id);

-- ============== can_access_school ==============
CREATE OR REPLACE FUNCTION public.can_access_school(_user_id uuid, _escola_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_member_of(_user_id, _escola_id);
$$;

-- ============== teacher_invites ==============
CREATE TABLE IF NOT EXISTS public.teacher_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL,
  email text NOT NULL,
  nome text,
  role public.app_role NOT NULL DEFAULT 'professor',
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | cancelled | expired
  convidado_por uuid NOT NULL,
  aceito_por uuid,
  aceito_em timestamptz,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invites_escola ON public.teacher_invites(escola_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.teacher_invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.teacher_invites(status);

GRANT SELECT, INSERT, UPDATE ON public.teacher_invites TO authenticated;
GRANT ALL ON public.teacher_invites TO service_role;

ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestor read invites" ON public.teacher_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), escola_id, 'gestor'::app_role));

CREATE POLICY "gestor create invites" ON public.teacher_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), escola_id, 'gestor'::app_role)
    AND convidado_por = auth.uid()
    AND role <> 'gestor'::app_role
  );

CREATE POLICY "gestor update invites" ON public.teacher_invites
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), escola_id, 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), escola_id, 'gestor'::app_role));

CREATE TRIGGER trg_invites_updated_at
BEFORE UPDATE ON public.teacher_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== invite_logs ==============
CREATE TABLE IF NOT EXISTS public.invite_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL,
  acao text NOT NULL, -- created | resent | accepted | cancelled | expired
  ator uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invite_logs_invite ON public.invite_logs(invite_id);

GRANT SELECT ON public.invite_logs TO authenticated;
GRANT ALL ON public.invite_logs TO service_role;

ALTER TABLE public.invite_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestor read invite logs" ON public.invite_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teacher_invites i
    WHERE i.id = invite_logs.invite_id
      AND public.has_role(auth.uid(), i.escola_id, 'gestor'::app_role)
  ));

-- ============== audit_logs ==============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  escola_id uuid,
  acao text NOT NULL,
  entidade text,
  entidade_id uuid,
  metadata jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_escola ON public.audit_logs(escola_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (escola_id IS NOT NULL AND public.is_staff_of(auth.uid(), escola_id));

-- log_audit helper
CREATE OR REPLACE FUNCTION public.log_audit(
  _user_id uuid, _escola_id uuid, _acao text,
  _entidade text DEFAULT NULL, _entidade_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL, _ip text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.audit_logs(user_id, escola_id, acao, entidade, entidade_id, metadata, ip)
  VALUES (_user_id, _escola_id, _acao, _entidade, _entidade_id, _metadata, _ip)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- ============== Storage buckets ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('reports', 'reports', false),
  ('school-assets', 'school-assets', false),
  ('qr-templates', 'qr-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extrai escola_id do primeiro segmento do path
-- Policies: leitura/escrita só para staff da escola dona do path

-- reports
CREATE POLICY "staff read reports" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff write reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff delete reports" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- school-assets
CREATE POLICY "members read school-assets" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND public.is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff write school-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff delete school-assets" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- qr-templates
CREATE POLICY "members read qr-templates" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'qr-templates'
    AND public.is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff write qr-templates" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-templates'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "staff delete qr-templates" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-templates'
    AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
