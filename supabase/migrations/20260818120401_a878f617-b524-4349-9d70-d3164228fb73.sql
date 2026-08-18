DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND NOT private.has_role(auth.uid(), 'approver'::app_role))
WITH CHECK (
  auth.uid() = id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.access_status IS NOT DISTINCT FROM profiles.access_status
      AND p.access_decided_at IS NOT DISTINCT FROM profiles.access_decided_at
      AND p.access_decided_by IS NOT DISTINCT FROM profiles.access_decided_by
  )
);