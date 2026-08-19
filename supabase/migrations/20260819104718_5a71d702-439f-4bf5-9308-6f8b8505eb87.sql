-- Reforça a política de auto-atualização para que usuários não possam alterar
-- colunas de aprovação. O WITH CHECK compara os valores novos com os atuais.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND access_status IS NOT DISTINCT FROM (
    SELECT p.access_status FROM public.profiles p WHERE p.id = auth.uid()
  )
  AND access_decided_at IS NOT DISTINCT FROM (
    SELECT p.access_decided_at FROM public.profiles p WHERE p.id = auth.uid()
  )
  AND access_decided_by IS NOT DISTINCT FROM (
    SELECT p.access_decided_by FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Mantém a função de decisão do aprovador como caminho exclusivo para
-- alterar access_status/access_decided_at/access_decided_by.
CREATE OR REPLACE FUNCTION public.decidir_acesso(
  p_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'approver'::public.app_role) THEN
    RAISE EXCEPTION 'Somente o aprovador pode decidir o acesso';
  END IF;

  UPDATE public.profiles
  SET access_status = p_status,
      access_decided_at = now(),
      access_decided_by = auth.uid()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decidir_acesso(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_acesso(uuid, text) TO authenticated;
