-- Non-approvers can never write approval columns (INSERT or UPDATE)
CREATE OR REPLACE FUNCTION private.prevent_self_access_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT private.has_role(auth.uid(), 'approver'::app_role) THEN
      NEW.access_status := 'pendente';
      NEW.access_decided_at := NULL;
      NEW.access_decided_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.access_status IS DISTINCT FROM OLD.access_status
      OR NEW.access_decided_at IS DISTINCT FROM OLD.access_decided_at
      OR NEW.access_decided_by IS DISTINCT FROM OLD.access_decided_by)
     AND NOT private.has_role(auth.uid(), 'approver'::app_role) THEN
    RAISE EXCEPTION 'Somente o aprovador pode alterar o status de acesso';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_self_access_approval() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_self_access_approval ON public.profiles;
CREATE TRIGGER prevent_self_access_approval
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.prevent_self_access_approval();

DROP TRIGGER IF EXISTS force_pending_access_on_insert ON public.profiles;
CREATE TRIGGER force_pending_access_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.prevent_self_access_approval();

-- Column privileges: regular users may only write non-sensitive columns
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, company, job_title, updated_at, email) ON public.profiles TO authenticated;
GRANT INSERT (id, full_name, company, job_title, email) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Self-update policy: no reliance on comparing a row to itself
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND NOT private.has_role(auth.uid(), 'approver'::app_role))
WITH CHECK (auth.uid() = id AND NOT private.has_role(auth.uid(), 'approver'::app_role));

-- Approver-only policy for approval decisions (unchanged intent)
DROP POLICY IF EXISTS "Approver can decide access" ON public.profiles;
CREATE POLICY "Approver can decide access"
ON public.profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'approver'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'approver'::app_role));

-- Approver keeps full write access to approval columns
GRANT UPDATE (access_status, access_decided_at, access_decided_by) ON public.profiles TO authenticated;