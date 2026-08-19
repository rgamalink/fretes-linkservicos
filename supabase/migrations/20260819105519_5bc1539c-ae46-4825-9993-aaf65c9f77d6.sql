REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;