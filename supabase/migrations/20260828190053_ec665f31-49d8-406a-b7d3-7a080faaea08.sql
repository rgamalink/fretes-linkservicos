INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'approver'::app_role
FROM public.profiles p
WHERE p.role = 'administrador'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
WHERE ur.role = 'approver'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ur.user_id AND p.role = 'administrador'
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = ur.user_id AND lower(u.email) = 'rodrigo.gama@linkbr.com'
  );