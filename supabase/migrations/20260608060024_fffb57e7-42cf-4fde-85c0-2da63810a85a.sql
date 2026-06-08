-- Restrict lotes_ocr INSERT to gestores/coordenadores (was: any school member).
DROP POLICY IF EXISTS "members create lotes" ON public.lotes_ocr;

CREATE POLICY "gestcoord create lotes" ON public.lotes_ocr
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gestor_ou_coordenador(auth.uid(), escola_id)
    AND criado_por = auth.uid()
  );