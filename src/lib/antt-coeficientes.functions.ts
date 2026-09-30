import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eixoSchema = z.object({ desloc: z.number().finite().positive(), cd: z.number().finite().positive() });

const inputSchema = z.object({
  peso: z.object({
    5: z.number().finite().positive(),
    6: z.number().finite().positive(),
    7: z.number().finite().positive(),
    9: z.number().finite().positive(),
  }),
  coef: z.object({
    granel: z.object({ 5: eixoSchema, 6: eixoSchema, 7: eixoSchema, 9: eixoSchema }),
    geral: z.object({ 5: eixoSchema, 6: eixoSchema, 7: eixoSchema, 9: eixoSchema }),
    container: z.object({ 5: eixoSchema, 6: eixoSchema, 7: eixoSchema, 9: eixoSchema }),
  }),
});

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

/**
 * Grava os índices ANTT (peso por eixo + deslocamento/carga-descarga por
 * tipo de carga x eixo) editados na tela "Atualizar Índices ANTT".
 */
export const atualizarAnttCoeficientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertApprover(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("antt_coeficientes").upsert(
      {
        id: "default",
        dados: data,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error("[atualizarAnttCoeficientes]", error);
      throw new Error("Não foi possível salvar os novos índices ANTT.");
    }
    return { ok: true };
  });
