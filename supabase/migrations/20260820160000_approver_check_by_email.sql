-- As políticas de aprovador dependiam de uma linha em public.user_roles
-- concedida por um gatilho que só dispara em INSERT novo em auth.users ou
-- na transição de confirmação de e-mail. Isso deixou o rodrigo.gama@linkbr.com
-- sem a role 'approver' (conta criada antes do gatilho existir), fazendo
-- com que ele não visse cadastros/cotações de outros usuários.
--
-- Troca a verificação por comparação direta de e-mail em auth.users —
-- a mesma lógica já usada no front-end (APPROVER_EMAIL) — eliminando a
-- dependência do gatilho/tabela de roles para este controle de acesso.
CREATE OR REPLACE FUNCTION private.is_approver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND lower(email) = 'rodrigo.gama@linkbr.com'
  );
$$;

REVOKE ALL ON FUNCTION private.is_approver() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_approver() TO authenticated;

DROP POLICY IF EXISTS "Approver can view all profiles" ON public.profiles;
CREATE POLICY "Approver can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (private.is_approver());

DROP POLICY IF EXISTS "Approver can decide access" ON public.user_access;
CREATE POLICY "Approver can decide access" ON public.user_access FOR UPDATE TO authenticated
USING (private.is_approver())
WITH CHECK (private.is_approver());

DROP POLICY IF EXISTS "Approver can view all access decisions" ON public.user_access;
CREATE POLICY "Approver can view all access decisions" ON public.user_access FOR SELECT TO authenticated
USING (private.is_approver());

DROP POLICY IF EXISTS "Approver can decide submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can decide submissions" ON public.cotacoes_aprovacao FOR UPDATE TO authenticated
USING (private.is_approver())
WITH CHECK (private.is_approver());

DROP POLICY IF EXISTS "Approver can view all submissions" ON public.cotacoes_aprovacao;
CREATE POLICY "Approver can view all submissions" ON public.cotacoes_aprovacao FOR SELECT TO authenticated
USING (private.is_approver());
