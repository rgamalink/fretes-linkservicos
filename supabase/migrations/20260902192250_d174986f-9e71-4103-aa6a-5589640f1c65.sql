-- 1) Substituir uso de has_role nas policies por subconsulta direta e revogar EXECUTE
DROP POLICY IF EXISTS "Approver can view all roles" ON public.user_roles;
CREATE POLICY "Approver can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, public;

-- 2) Restringir leitura de cotacoes_status ao dono da cotação (ou aprovador)
DROP POLICY IF EXISTS "Signed-in users can view quote statuses" ON public.cotacoes_status;
CREATE POLICY "Users can view own quote statuses"
ON public.cotacoes_status FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cotacoes_aprovacao ca
    WHERE ca.id = cotacoes_status.cotacao_id AND ca.user_id = auth.uid()
  )
);
CREATE POLICY "Approver can view all quote statuses"
ON public.cotacoes_status FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::app_role));