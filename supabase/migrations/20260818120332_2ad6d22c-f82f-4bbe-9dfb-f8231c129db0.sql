CREATE OR REPLACE FUNCTION private.prevent_self_access_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
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

-- Column-level privileges: regular users cannot update approval columns at all
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, company, job_title, updated_at, email) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND NOT private.has_role(auth.uid(), 'approver'::app_role))
WITH CHECK (auth.uid() = id AND access_status = (SELECT p.access_status FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Approver can decide access" ON public.profiles;
CREATE POLICY "Approver can decide access"
ON public.profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'approver'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'approver'::app_role));

GRANT UPDATE (access_status, access_decided_at, access_decided_by) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;