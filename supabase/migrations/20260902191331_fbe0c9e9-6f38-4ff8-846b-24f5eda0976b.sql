REVOKE ALL ON FUNCTION public.prevent_profile_role_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_admin_role() FROM PUBLIC, anon, authenticated;