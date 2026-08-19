-- Substitui chamadas de função pelas verificações inline de papel (RLS de user_roles limita à própria linha)
DROP POLICY IF EXISTS "Approver can view all profiles" ON public.profiles;
CREATE POLICY "Approver can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role));

DROP POLICY IF EXISTS "Approver can decide access" ON public.user_access;
CREATE POLICY "Approver can decide access" ON public.user_access FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role));

DROP POLICY IF EXISTS "Approver can view all access decisions" ON public.user_access;
CREATE POLICY "Approver can view all access decisions" ON public.user_access FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role));

DROP POLICY IF EXISTS "Approver can decide submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can decide submissions" ON public.cotacoes_aprovacao FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role));

DROP POLICY IF EXISTS "Approver can view all submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can view all submissions" ON public.cotacoes_aprovacao FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::public.app_role));

DROP FUNCTION IF EXISTS private.has_role(uuid, public.app_role) CASCADE;