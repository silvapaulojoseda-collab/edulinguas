
-- =========================================================
-- 0. Clean previous demo tables/policies (insecure USING true)
-- =========================================================
DROP TABLE IF EXISTS public.gabaritos_ocr CASCADE;
DROP TABLE IF EXISTS public.pareceres_ia CASCADE;
DROP TABLE IF EXISTS public.notificacoes CASCADE;
-- keep alunos (data) but drop its demo policies, restructure below
ALTER TABLE public.alunos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demo read alunos" ON public.alunos;
DROP POLICY IF EXISTS "demo write alunos" ON public.alunos;

-- =========================================================
-- 1. Core domain tables
-- =========================================================
CREATE TABLE public.escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  inep TEXT,
  cidade TEXT,
  uf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  escola_ativa_id UUID REFERENCES public.escolas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.app_role AS ENUM ('gestor', 'coordenador', 'professor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, escola_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_escola ON public.user_roles(escola_id);

CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  serie TEXT,
  curso TEXT,
  ano_letivo INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_turmas_escola ON public.turmas(escola_id);

CREATE TABLE public.professor_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, turma_id, disciplina)
);
CREATE INDEX idx_pt_user ON public.professor_turmas(user_id);
CREATE INDEX idx_pt_turma ON public.professor_turmas(turma_id);

-- Restructure alunos
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escolas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_escola ON public.alunos(escola_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON public.alunos(turma_id);

CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'diagnostica',
  disciplina TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  num_questoes INT NOT NULL DEFAULT 30,
  descritores TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avaliacoes_escola ON public.avaliacoes(escola_id);

CREATE TABLE public.gabaritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  alternativa_correta TEXT NOT NULL CHECK (alternativa_correta IN ('A','B','C','D','E')),
  descritor TEXT,
  UNIQUE (avaliacao_id, ordem)
);

CREATE TABLE public.lotes_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  total INT NOT NULL DEFAULT 0,
  processados INT NOT NULL DEFAULT 0,
  erros INT NOT NULL DEFAULT 0,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET DEFAULT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lotes_ocr ALTER COLUMN criado_por DROP NOT NULL;
CREATE INDEX idx_lotes_escola ON public.lotes_ocr(escola_id);
CREATE INDEX idx_lotes_status ON public.lotes_ocr(status);

CREATE TABLE public.cartoes_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes_ocr(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  qr_lido TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ok','dupla','qr_invalido','erro')),
  marcacoes JSONB,
  acertos INT,
  total INT,
  motivo_erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cartoes_lote ON public.cartoes_ocr(lote_id);

CREATE TABLE public.respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES public.cartoes_ocr(id) ON DELETE CASCADE,
  questao_ordem INT NOT NULL,
  marcada TEXT,
  correta BOOLEAN NOT NULL DEFAULT false,
  descritor TEXT
);
CREATE INDEX idx_respostas_cartao ON public.respostas(cartao_id);

CREATE TABLE public.pareceres_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  avaliacao_id UUID REFERENCES public.avaliacoes(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  disciplina TEXT,
  texto TEXT NOT NULL,
  dados JSONB,
  modelo TEXT NOT NULL DEFAULT 'openai/gpt-5.2',
  gerado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pareceres_escola ON public.pareceres_ia(escola_id);

CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escola_id UUID REFERENCES public.escolas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notificacoes(user_id);

-- =========================================================
-- 2. Security definer functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _escola_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND escola_id = _escola_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(_user_id UUID, _escola_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND escola_id = _escola_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_of(_user_id UUID, _escola_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND escola_id = _escola_id
      AND role IN ('gestor','coordenador')
  );
$$;

CREATE OR REPLACE FUNCTION public.teaches_turma(_user_id UUID, _turma_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professor_turmas
    WHERE user_id = _user_id AND turma_id = _turma_id
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lotes_updated BEFORE UPDATE ON public.lotes_ocr
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 3. Enable RLS + secure policies
-- =========================================================
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gabaritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pareceres_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- escolas: member can read; only gestor can create/update
CREATE POLICY "members read escolas" ON public.escolas FOR SELECT
  USING (public.is_member_of(auth.uid(), id));
CREATE POLICY "gestor update escolas" ON public.escolas FOR UPDATE
  USING (public.has_role(auth.uid(), id, 'gestor'));

-- profiles: each user reads own; staff of same school read teammates
CREATE POLICY "self read profile" ON public.profiles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "self insert profile" ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- user_roles: user reads own; only gestor of that school manages
CREATE POLICY "self read roles" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff_of(auth.uid(), escola_id));
CREATE POLICY "gestor manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), escola_id, 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), escola_id, 'gestor'));

-- turmas
CREATE POLICY "members read turmas" ON public.turmas FOR SELECT
  USING (public.is_member_of(auth.uid(), escola_id));
CREATE POLICY "staff manage turmas" ON public.turmas FOR ALL
  USING (public.is_staff_of(auth.uid(), escola_id))
  WITH CHECK (public.is_staff_of(auth.uid(), escola_id));

-- professor_turmas
CREATE POLICY "read professor_turmas" ON public.professor_turmas FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.turmas t WHERE t.id = professor_turmas.turma_id
      AND public.is_staff_of(auth.uid(), t.escola_id)
  ));
CREATE POLICY "staff manage professor_turmas" ON public.professor_turmas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.turmas t WHERE t.id = professor_turmas.turma_id
      AND public.is_staff_of(auth.uid(), t.escola_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.turmas t WHERE t.id = professor_turmas.turma_id
      AND public.is_staff_of(auth.uid(), t.escola_id)
  ));

-- alunos: staff vê toda escola; professor vê só sua(s) turma(s)
CREATE POLICY "read alunos" ON public.alunos FOR SELECT
  USING (
    escola_id IS NOT NULL AND (
      public.is_staff_of(auth.uid(), escola_id)
      OR (turma_id IS NOT NULL AND public.teaches_turma(auth.uid(), turma_id))
    )
  );
CREATE POLICY "staff manage alunos" ON public.alunos FOR ALL
  USING (escola_id IS NOT NULL AND public.is_staff_of(auth.uid(), escola_id))
  WITH CHECK (escola_id IS NOT NULL AND public.is_staff_of(auth.uid(), escola_id));

-- avaliacoes
CREATE POLICY "members read avaliacoes" ON public.avaliacoes FOR SELECT
  USING (public.is_member_of(auth.uid(), escola_id));
CREATE POLICY "staff manage avaliacoes" ON public.avaliacoes FOR ALL
  USING (public.is_staff_of(auth.uid(), escola_id))
  WITH CHECK (public.is_staff_of(auth.uid(), escola_id));

-- gabaritos via avaliacao
CREATE POLICY "read gabaritos" ON public.gabaritos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = gabaritos.avaliacao_id
    AND public.is_member_of(auth.uid(), a.escola_id)));
CREATE POLICY "staff manage gabaritos" ON public.gabaritos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = gabaritos.avaliacao_id
    AND public.is_staff_of(auth.uid(), a.escola_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = gabaritos.avaliacao_id
    AND public.is_staff_of(auth.uid(), a.escola_id)));

-- lotes_ocr
CREATE POLICY "members read lotes" ON public.lotes_ocr FOR SELECT
  USING (public.is_member_of(auth.uid(), escola_id));
CREATE POLICY "members create lotes" ON public.lotes_ocr FOR INSERT
  WITH CHECK (public.is_member_of(auth.uid(), escola_id) AND criado_por = auth.uid());
CREATE POLICY "owner staff update lotes" ON public.lotes_ocr FOR UPDATE
  USING (criado_por = auth.uid() OR public.is_staff_of(auth.uid(), escola_id));
CREATE POLICY "staff delete lotes" ON public.lotes_ocr FOR DELETE
  USING (public.is_staff_of(auth.uid(), escola_id));

-- cartoes_ocr via lote
CREATE POLICY "read cartoes" ON public.cartoes_ocr FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lotes_ocr l WHERE l.id = cartoes_ocr.lote_id
    AND public.is_member_of(auth.uid(), l.escola_id)));
CREATE POLICY "staff write cartoes" ON public.cartoes_ocr FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lotes_ocr l WHERE l.id = cartoes_ocr.lote_id
    AND public.is_member_of(auth.uid(), l.escola_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lotes_ocr l WHERE l.id = cartoes_ocr.lote_id
    AND public.is_member_of(auth.uid(), l.escola_id)));

-- respostas via cartao
CREATE POLICY "read respostas" ON public.respostas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cartoes_ocr c
    JOIN public.lotes_ocr l ON l.id = c.lote_id
    WHERE c.id = respostas.cartao_id AND public.is_member_of(auth.uid(), l.escola_id)
  ));

-- pareceres_ia
CREATE POLICY "members read pareceres" ON public.pareceres_ia FOR SELECT
  USING (public.is_member_of(auth.uid(), escola_id));
CREATE POLICY "members write pareceres" ON public.pareceres_ia FOR INSERT
  WITH CHECK (public.is_member_of(auth.uid(), escola_id));

-- notificacoes (per-user)
CREATE POLICY "own notif read" ON public.notificacoes FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own notif update" ON public.notificacoes FOR UPDATE
  USING (user_id = auth.uid());

-- =========================================================
-- 4. Storage bucket privado para cartões
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cartoes-resposta', 'cartoes-resposta', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {escola_id}/{lote_id}/{filename}
CREATE POLICY "members read cartoes files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cartoes-resposta'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
CREATE POLICY "members upload cartoes files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cartoes-resposta'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
CREATE POLICY "staff delete cartoes files" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cartoes-resposta'
    AND public.is_staff_of(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- =========================================================
-- 5. Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes_ocr;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartoes_ocr;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- =========================================================
-- 6. Seed escola padrão + turmas
-- =========================================================
INSERT INTO public.escolas (id, nome, cidade, uf)
VALUES ('00000000-0000-0000-0000-00000000e001', 'EEEP Profa. Maria Dolores', 'Fortaleza', 'CE')
ON CONFLICT (id) DO NOTHING;
