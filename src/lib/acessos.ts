import { supabase } from "@/integrations/supabase/client";

export type AcessoStatus = "pendente" | "aprovado" | "reprovado";

export type UsuarioAcesso = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  access_status: string;
  created_at: string;
  access_decided_at: string | null;
};

/** Status de acesso do usuário logado. */
export async function meuAcesso(userId: string): Promise<AcessoStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("access_status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return "pendente";
  return (data.access_status as AcessoStatus) ?? "pendente";
}

/** Lista todos os cadastros (apenas o aprovador tem permissão). */
export async function listarUsuarios(): Promise<UsuarioAcesso[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company, access_status, created_at, access_decided_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UsuarioAcesso[];
}

/** Aprova ou reprova o acesso de um cadastro (apenas aprovador via RPC segura). */
export async function decidirAcesso(id: string, status: AcessoStatus) {
  const { error } = await supabase.rpc("decidir_acesso", {
    p_id: id,
    p_status: status,
  });
  if (error) throw error;
}
