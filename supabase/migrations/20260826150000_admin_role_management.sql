-- Adiciona um perfil persistido (administrador/usuario) que o administrador
-- pode atribuir a qualquer usuário pela tela de Configuração, além do
-- e-mail fixo (rodrigo.gama@linkbr.com), que continua sempre administrador
-- independentemente do valor desta coluna.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'usuario';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('administrador', 'usuario'));

-- private.is_approver() passa a valer tanto para o e-mail fixo quanto para
-- qualquer perfil marcado como administrador — como já é SECURITY DEFINER e
-- usado em todas as políticas de aprovador (profiles, user_access,
-- cotacoes_aprovacao), essa única mudança propaga o novo perfil para todo o
-- controle de acesso existente.
CREATE OR REPLACE FUNCTION private.is_approver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND (lower(u.email) = 'rodrigo.gama@linkbr.com' OR p.role = 'administrador')
  );
$$;

-- Só um administrador pode alterar o perfil de outro usuário; nunca o
-- próprio e-mail fixo (ele é sempre administrador, independentemente da
-- coluna), evitando um trancamento acidental do acesso.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_approver() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar perfis.';
  END IF;
  IF new_role NOT IN ('administrador', 'usuario') THEN
    RAISE EXCEPTION 'Perfil inválido: %', new_role;
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_id AND lower(email) = 'rodrigo.gama@linkbr.com'
  ) THEN
    RAISE EXCEPTION 'O perfil de rodrigo.gama@linkbr.com não pode ser alterado.';
  END IF;

  UPDATE public.profiles SET role = new_role WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- Remove apenas o cadastro (profiles + user_access) — não apaga a conta de
-- login em auth.users, então a pessoa continua conseguindo entrar e volta a
-- aparecer como pendente. Nunca permite apagar a si mesmo nem o e-mail
-- fixo, para não travar o acesso de administração.
CREATE OR REPLACE FUNCTION public.admin_excluir_usuario(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_approver() THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir cadastros.';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir seu próprio cadastro.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_id AND lower(email) = 'rodrigo.gama@linkbr.com'
  ) THEN
    RAISE EXCEPTION 'O cadastro de rodrigo.gama@linkbr.com não pode ser excluído.';
  END IF;

  DELETE FROM public.user_access WHERE user_id = target_id;
  DELETE FROM public.profiles WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_excluir_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario(uuid) TO authenticated;
