import { supabase } from "@/integrations/supabase/client";

export type AcessoStatus = "pendente" | "aprovado" | "reprovado";
export type PerfilUsuario = "administrador" | "usuario";

export interface UsuarioAcesso {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  access_status: string;
  created_at: string;
  access_decided_at: string | null;
  role: PerfilUsuario;
}

/** Diz se o usuário logado tem perfil administrador (independente do e-mail fixo). */
export async function souAdministrador(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "administrador";
}

/** Retorna o status de acesso do usuário logado. */
export async function meuAcesso(userId: string): Promise<AcessoStatus> {
  const { data, error } = await supabase
    .from("user_access")
    .select("access_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return "pendente";
  return (data.access_status as AcessoStatus) ?? "pendente";
}

/** Lista todos os usuários com seus status de acesso (apenas aprovador). */
export async function listarUsuarios(): Promise<UsuarioAcesso[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: accessData, error: accessError } = await supabase
    .from("user_access")
    .select("user_id, access_status, access_decided_at");
  if (accessError) throw accessError;

  const accessMap = new Map(
    (accessData ?? []).map((a) => [a.user_id, a])
  );

  // Consulta a coluna role à parte: se a migração que a adiciona ainda não
  // foi aplicada ao banco, isso não deve impedir a lista de aparecer — só
  // faz todo mundo cair no perfil padrão "usuario" até a migração rodar.
  const roleMap = new Map<string, PerfilUsuario>();
  try {
    const { data: roleData, error: roleError } = await supabase.from("profiles").select("id, role");
    if (roleError) throw roleError;
    for (const r of roleData ?? []) roleMap.set(r.id, (r.role as PerfilUsuario) ?? "usuario");
  } catch {
    /* coluna profiles.role ainda não existe no banco */
  }

  return (data ?? []).map((p) => {
    const access = accessMap.get(p.id);
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      company: p.company,
      access_status: access?.access_status ?? "pendente",
      created_at: p.created_at,
      access_decided_at: access?.access_decided_at ?? null,
      role: roleMap.get(p.id) ?? "usuario",
    };
  }) as UsuarioAcesso[];
}

/** Aprova ou reprova o acesso de um cadastro (apenas aprovador via RLS). */
export async function decidirAcesso(id: string, status: AcessoStatus) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("user_access")
    .update({
      access_status: status,
      access_decided_at: new Date().toISOString(),
      access_decided_by: userData.user?.id ?? null,
    })
    .eq("user_id", id);
  if (error) throw error;
}

/** Altera o perfil (administrador/usuario) de um usuário — validado no servidor. */
export async function definirPerfil(id: string, role: PerfilUsuario) {
  const { adminDefinirPerfil } = await import("@/lib/admin-usuarios.functions");
  await adminDefinirPerfil({ data: { targetId: id, role } });
}

/** Exclui o cadastro (profiles + user_access) de um usuário — validado no servidor. */
export async function excluirUsuario(id: string) {
  const { adminExcluirUsuario } = await import("@/lib/admin-usuarios.functions");
  await adminExcluirUsuario({ data: { targetId: id } });
}

