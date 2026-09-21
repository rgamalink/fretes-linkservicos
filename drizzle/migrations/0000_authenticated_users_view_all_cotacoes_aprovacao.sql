DROP POLICY IF EXISTS "Users can view their own submissions" ON public.cotacoes_aprovacao;
DROP POLICY IF EXISTS "Approver can view all submissions" ON public.cotacoes_aprovacao;

CREATE POLICY "Authenticated users can view all submissions"
ON public.cotacoes_aprovacao FOR SELECT TO authenticated
USING (true);