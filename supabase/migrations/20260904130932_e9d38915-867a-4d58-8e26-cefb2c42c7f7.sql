DROP POLICY IF EXISTS "Approver can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Approver can grant approver role" ON public.user_roles;
DROP POLICY IF EXISTS "Approver can revoke approver role" ON public.user_roles;