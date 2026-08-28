import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const APPROVER_EMAIL = "rodrigo.gama@linkbr.com";

const perfilSchema = z.object({
  targetId: z.string().uuid(),
  role: z.enum(["administrador", "usuario"]),
});

const excluirSchema = z.object({ targetId: z.string().uuid() });

/** Confirma no servidor que o chamador realmente possui o papel de aprovador. */
async function assertApprover(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "approver")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Apenas administradores podem executar esta ação.");
  }
}

/** Impede alterar/excluir a conta protegida do aprovador principal. */
async function assertNotProtected(admin: any, targetId: string) {
  const { data } = await admin.auth.admin.getUserById(targetId);
  const email = (data?.user?.email ?? "").toLowerCase();
  if (email === APPROVER_EMAIL) {
    throw new Error(`O cadastro de ${APPROVER_EMAIL} não pode ser alterado.`);
  }
}

export const adminDefinirPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => perfilSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertApprover(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertNotProtected(supabaseAdmin, data.targetId);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.targetId);
    if (error) {
      console.error("[adminDefinirPerfil]", error);
      throw new Error("Não foi possível alterar o perfil.");
    }

    // As políticas de acesso (RLS) usam public.user_roles, então o papel
    // "approver" precisa acompanhar o perfil escolhido aqui — sem isso o
    // administrador promovido veria os botões, mas sem permissão real.
    if (data.role === "administrador") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.targetId, role: "approver" }, { onConflict: "user_id,role" });
      if (roleError) {
        console.error("[adminDefinirPerfil] user_roles insert", roleError);
        throw new Error("Não foi possível conceder as permissões de administrador.");
      }
    } else {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetId)
        .eq("role", "approver");
      if (roleError) {
        console.error("[adminDefinirPerfil] user_roles delete", roleError);
        throw new Error("Não foi possível remover as permissões de administrador.");
      }
    }
    return { ok: true };
  });


export const adminExcluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => excluirSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertApprover(context);
    if (data.targetId === context.userId) {
      throw new Error("Você não pode excluir seu próprio cadastro.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertNotProtected(supabaseAdmin, data.targetId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetId);


    const { error: accessError } = await supabaseAdmin
      .from("user_access")
      .delete()
      .eq("user_id", data.targetId);
    if (accessError) {
      console.error("[adminExcluirUsuario] user_access", accessError);
      throw new Error("Não foi possível excluir o cadastro.");
    }
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.targetId);
    if (profileError) {
      console.error("[adminExcluirUsuario] profiles", profileError);
      throw new Error("Não foi possível excluir o cadastro.");
    }
    return { ok: true };
  });
