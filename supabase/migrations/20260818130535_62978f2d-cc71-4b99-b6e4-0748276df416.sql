-- Remove permissão direta de UPDATE nas colunas sensíveis de aprovação para usuários autenticados.
REVOKE UPDATE (access_status, access_decided_at, access_decided_by) ON public.profiles FROM authenticated;

-- Função exclusiva do aprovador para aprovar/reprovar acesso de um cadastro.
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
