-- 1. Tabela separada para controle de acesso (apenas aprovador altera).
CREATE TABLE IF NOT EXISTS public.user_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_status text NOT NULL DEFAULT 'pendente',
  access_decided_at timestamptz,
  access_decided_by uuid
);

GRANT SELECT ON public.user_access TO authenticated;
GRANT ALL ON public.user_access TO service_role;

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approver can view all access decisions" ON public.user_access;
CREATE POLICY "Approver can view all access decisions"
ON public.user_access FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'approver'::public.app_role));

DROP POLICY IF EXISTS "Users can view own access status" ON public.user_access;
CREATE POLICY "Users can view own access status"
ON public.user_access FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Approver can decide access" ON public.user_access;
CREATE POLICY "Approver can decide access"
ON public.user_access FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'approver'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'approver'::public.app_role));

-- 2. Migra dados existentes.
INSERT INTO public.user_access (user_id, access_status, access_decided_at, access_decided_by)
SELECT id, access_status, access_decided_at, access_decided_by
FROM public.profiles
WHERE access_status IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  access_status = EXCLUDED.access_status,
  access_decided_at = EXCLUDED.access_decided_at,
  access_decided_by = EXCLUDED.access_decided_by;

-- 3. Remove políticas dependentes das colunas sensíveis antes de dropá-las.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Approver can decide access" ON public.profiles;

-- 4. Remove gatilhos e funções antigas que protegiam as colunas em profiles.
DROP TRIGGER IF EXISTS prevent_self_access_approval ON public.profiles;
DROP TRIGGER IF EXISTS force_pending_access_on_insert ON public.profiles;
DROP FUNCTION IF EXISTS private.prevent_self_access_approval();
DROP FUNCTION IF EXISTS public.decidir_acesso(uuid, text);

-- 5. Remove as colunas sensíveis de profiles.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS access_status,
  DROP COLUMN IF EXISTS access_decided_at,
  DROP COLUMN IF EXISTS access_decided_by;

-- 6. Atualiza o gatilho de novo usuário para inserir em profiles e user_access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_access (user_id, access_status)
  VALUES (
    NEW.id,
    CASE WHEN lower(NEW.email) = 'rodrigo.gama@linkbr.com' THEN 'aprovado' ELSE 'pendente' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 7. Simplifica a política de auto-atualização de perfil (sem colunas sensíveis).
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
