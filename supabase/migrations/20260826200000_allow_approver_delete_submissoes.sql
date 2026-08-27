-- Permite ao administrador apagar submissões (individualmente ou em lote)
-- pela tela "Cotações Submetidas à Aprovação". cotacoes_status já limpa
-- sozinha via ON DELETE CASCADE (cotacao_id referencia cotacoes_aprovacao).
GRANT DELETE ON public.cotacoes_aprovacao TO authenticated;

DROP POLICY IF EXISTS "Approver can delete submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can delete submissions" ON public.cotacoes_aprovacao FOR DELETE TO authenticated
USING (private.is_approver());
