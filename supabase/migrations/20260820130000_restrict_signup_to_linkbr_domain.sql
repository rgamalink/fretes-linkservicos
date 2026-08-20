-- Bloqueia a criação de contas (qualquer provedor de login) para e-mails
-- fora do domínio @linkbr.com. Defesa em profundidade: a validação já
-- existe no formulário de cadastro, mas o gate real precisa estar no banco,
-- já que a API do Supabase Auth pode ser chamada diretamente.
CREATE OR REPLACE FUNCTION public.restrict_signup_to_linkbr_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (lower(NEW.email) LIKE '%@linkbr.com') THEN
    RAISE EXCEPTION 'Apenas e-mails @linkbr.com podem se cadastrar neste sistema.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.restrict_signup_to_linkbr_domain() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS restrict_signup_to_linkbr_domain ON auth.users;
CREATE TRIGGER restrict_signup_to_linkbr_domain
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.restrict_signup_to_linkbr_domain();
