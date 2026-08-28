-- 1) Remove SECURITY DEFINER RPCs callable by signed-in users.
DROP FUNCTION IF EXISTS public.admin_set_user_role(uuid, text);
DROP FUNCTION IF EXISTS public.admin_excluir_usuario(uuid);
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.is_approver() FROM anon, authenticated;

-- 2) Prevent users from escalating privileges through profiles.role.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
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

REVOKE ALL ON FUNCTION public.prevent_profile_role_self_update() FROM anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_role_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_self_update();