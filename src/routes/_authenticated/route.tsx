import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    // Aprovação manual desativada: qualquer conta @linkbr.com autenticada
    // tem acesso liberado imediatamente após o cadastro.
    if (!(data.user.email ?? "").toLowerCase().endsWith("@linkbr.com")) {
      await supabase.auth.signOut();
      throw redirect({ to: "/" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
