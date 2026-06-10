
-- 1) GRANT EXECUTE nas funções usadas pelas policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_turma(uuid, uuid) TO authenticated;

-- 2) Tabela cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escola_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_cursos_escola ON public.cursos(escola_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cursos TO authenticated;
GRANT ALL ON public.cursos TO service_role;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read cursos" ON public.cursos
  FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), escola_id));

CREATE POLICY "gestcoord manage cursos" ON public.cursos
  FOR ALL TO authenticated
  USING (public.is_gestor_ou_coordenador(auth.uid(), escola_id))
  WITH CHECK (public.is_gestor_ou_coordenador(auth.uid(), escola_id));

CREATE TRIGGER trg_cursos_updated
  BEFORE UPDATE ON public.cursos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Estender turmas
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS turno text,
  ADD COLUMN IF NOT EXISTS capacidade integer,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_turmas_curso ON public.turmas(curso_id);

DROP TRIGGER IF EXISTS trg_turmas_updated ON public.turmas;
CREATE TRIGGER trg_turmas_updated
  BEFORE UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Alunos: matrícula única por escola + updated_at
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_alunos_updated ON public.alunos;
CREATE TRIGGER trg_alunos_updated
  BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS alunos_escola_matricula_uk
  ON public.alunos(escola_id, matricula)
  WHERE matricula IS NOT NULL;
