DROP POLICY IF EXISTS "Authenticated users can view all submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Authenticated users can view all submissions"
ON public.cotacoes_aprovacao FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Signed-in users can view all saved quotes" ON public.cotacoes_salvas;
CREATE POLICY "Signed-in users can view all saved quotes"
ON public.cotacoes_salvas FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Signed-in users can view antt coeficientes" ON public.antt_coeficientes;
CREATE POLICY "Signed-in users can view antt coeficientes"
ON public.antt_coeficientes FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Signed-in users can view valores de mercadoria" ON public.valores_mercadoria;
CREATE POLICY "Signed-in users can view valores de mercadoria"
ON public.valores_mercadoria FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);