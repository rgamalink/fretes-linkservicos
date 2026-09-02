-- 1) Sincroniza profiles.role -> user_roles (fonte real usada pelas policies)
CREATE OR REPLACE FUNCTION public.sync_profile_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'administrador' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'approver')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'approver';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_admin_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_admin_role ON public.profiles;
CREATE TRIGGER profiles_sync_admin_role
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_admin_role();

-- 2) Permite que a alteração de perfil feita pelo servidor (service_role,
--    sem auth.uid()) funcione; mantém o bloqueio para o próprio usuário.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'approver'
    ) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o perfil de acesso.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Backfill: administrador principal + coerência entre profiles e user_roles
UPDATE public.profiles p
SET role = 'administrador'
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = 'rodrigo.gama@linkbr.com' AND p.role <> 'administrador';

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'approver'::app_role FROM public.profiles p WHERE p.role = 'administrador'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
WHERE ur.role = 'approver'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id AND p.role = 'administrador');

-- 4) Administradores podem alterar o perfil de outros usuários direto pela API
DROP POLICY IF EXISTS "Approver can update any profile" ON public.profiles;
CREATE POLICY "Approver can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

-- 5) Administradores podem conceder/remover o papel de aprovador
DROP POLICY IF EXISTS "Approver can grant approver role" ON public.user_roles;
CREATE POLICY "Approver can grant approver role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (role = 'approver' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));

DROP POLICY IF EXISTS "Approver can revoke approver role" ON public.user_roles;
CREATE POLICY "Approver can revoke approver role"
ON public.user_roles FOR DELETE TO authenticated
USING (role = 'approver' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'));
