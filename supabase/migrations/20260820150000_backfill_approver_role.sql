-- O gatilho que concede a role 'approver' só dispara em INSERT novo em
-- auth.users ou na transição email_confirmed_at NULL -> NOT NULL. A conta
-- de rodrigo.gama@linkbr.com já existia antes desse gatilho ser criado,
-- então nunca recebeu a role — fazendo com que as políticas de RLS
-- "approver vê tudo" (profiles, user_access) nunca se aplicassem a ele.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'approver'::public.app_role
FROM auth.users
WHERE lower(email) = 'rodrigo.gama@linkbr.com'
ON CONFLICT (user_id, role) DO NOTHING;
