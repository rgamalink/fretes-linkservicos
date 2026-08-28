REVOKE ALL ON FUNCTION public.prevent_profile_role_self_update() FROM PUBLIC;

-- Replace policies that depend on private.is_approver() with inline role checks,
-- so no SECURITY DEFINER function needs to be executable by app roles.
DROP POLICY IF EXISTS "Approver can view all profiles" ON public.profiles;
CREATE POLICY "Approver can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can view all access decisions" ON public.user_access;
CREATE POLICY "Approver can view all access decisions" ON public.user_access
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can decide access" ON public.user_access;
CREATE POLICY "Approver can decide access" ON public.user_access
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can view all submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can view all submissions" ON public.cotacoes_aprovacao
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can decide submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can decide submissions" ON public.cotacoes_aprovacao
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can delete submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can delete submissions" ON public.cotacoes_aprovacao
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));