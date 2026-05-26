
-- 1. cartoes_ocr: split into staff-only writes, member reads
DROP POLICY IF EXISTS "staff write cartoes" ON public.cartoes_ocr;

CREATE POLICY "staff insert cartoes" ON public.cartoes_ocr
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lotes_ocr l
  WHERE l.id = cartoes_ocr.lote_id AND public.is_staff_of(auth.uid(), l.escola_id)
));

CREATE POLICY "staff update cartoes" ON public.cartoes_ocr
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.lotes_ocr l
  WHERE l.id = cartoes_ocr.lote_id AND public.is_staff_of(auth.uid(), l.escola_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lotes_ocr l
  WHERE l.id = cartoes_ocr.lote_id AND public.is_staff_of(auth.uid(), l.escola_id)
));

CREATE POLICY "staff delete cartoes" ON public.cartoes_ocr
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.lotes_ocr l
  WHERE l.id = cartoes_ocr.lote_id AND public.is_staff_of(auth.uid(), l.escola_id)
));

-- 2. Storage: add UPDATE policy for cartoes-resposta bucket (staff only)
CREATE POLICY "staff update cartoes files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'cartoes-resposta'
  AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'cartoes-resposta'
  AND public.is_staff_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 3. Realtime channel authorization (default-deny + scoped topics)
-- Allow only topics of form 'user:<auth.uid()>' or 'escola:<escola_id user belongs to>'
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read own topics" ON realtime.messages;
CREATE POLICY "authenticated read own topics" ON realtime.messages
FOR SELECT TO authenticated
USING (
  (realtime.topic() = 'user:' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'escola:%'
    AND public.is_member_of(auth.uid(), substring(realtime.topic() from 8)::uuid)
  )
);

DROP POLICY IF EXISTS "authenticated write own topics" ON realtime.messages;
CREATE POLICY "authenticated write own topics" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() = 'user:' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'escola:%'
    AND public.is_member_of(auth.uid(), substring(realtime.topic() from 8)::uuid)
  )
);

-- 4. respostas: explicit restrictive deny for writes (writes only via service_role which bypasses RLS)
CREATE POLICY "block client writes respostas insert" ON public.respostas
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "block client writes respostas update" ON public.respostas
AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "block client writes respostas delete" ON public.respostas
AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 5. user_roles: prevent gestor self-escalation and gestor deletion via RLS
DROP POLICY IF EXISTS "gestor manage roles" ON public.user_roles;

-- Gestor can only INSERT non-gestor roles in their school
CREATE POLICY "gestor insert non-gestor roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), escola_id, 'gestor'::app_role)
  AND role <> 'gestor'::app_role
);

-- Gestor can UPDATE only non-gestor rows to non-gestor roles in their school
CREATE POLICY "gestor update non-gestor roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), escola_id, 'gestor'::app_role)
  AND role <> 'gestor'::app_role
)
WITH CHECK (
  public.has_role(auth.uid(), escola_id, 'gestor'::app_role)
  AND role <> 'gestor'::app_role
);

-- Gestor can DELETE only non-gestor rows in their school (gestor rows cannot be removed via RLS)
CREATE POLICY "gestor delete non-gestor roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), escola_id, 'gestor'::app_role)
  AND role <> 'gestor'::app_role
);
