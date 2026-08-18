CREATE OR REPLACE FUNCTION private.prevent_self_access_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.access_status IS DISTINCT FROM OLD.access_status
     AND NOT private.has_role(auth.uid(), 'approver'::app_role) THEN
    RAISE EXCEPTION 'Somente o aprovador pode alterar o status de acesso';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_access_approval ON public.profiles;
CREATE TRIGGER prevent_self_access_approval
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.prevent_self_access_approval();

REVOKE ALL ON FUNCTION private.prevent_self_access_approval() FROM PUBLIC;