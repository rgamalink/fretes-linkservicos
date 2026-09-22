-- "Cotações Salvas" era guardada em localStorage (por navegador/usuário), então
-- ninguém via as cotações salvas por outros usuários. Move para uma tabela
-- compartilhada: qualquer usuário autenticado (usuário ou administrador) passa
-- a ver as cotações salvas por todos.
--
-- A política de exclusão usa uma subconsulta direta em user_roles em vez de
-- has_role(), já que este banco revogou EXECUTE dessa função de authenticated
-- (ver migration 20260902192250).

CREATE TABLE public.cotacoes_salvas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by_email text,
  cliente text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT '',
  destino text NOT NULL DEFAULT '',
  gerais jsonb NOT NULL,
  cards jsonb NOT NULL,
  salvo_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes_salvas TO authenticated;
GRANT ALL ON public.cotacoes_salvas TO service_role;

ALTER TABLE public.cotacoes_salvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view all saved quotes"
ON public.cotacoes_salvas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Signed-in users can save their own quotes"
ON public.cotacoes_salvas FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or approver can update saved quotes"
ON public.cotacoes_salvas FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::app_role)
);

CREATE POLICY "Owner or approver can delete saved quotes"
ON public.cotacoes_salvas FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'approver'::app_role)
);
