import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  produto: z.string().min(1),
  avg: z.number().finite(),
  n: z.number().int().positive(),
  janelaMeses: z.union([z.literal(12), z.literal(18), z.literal(24)]),
});

const inputSchema = z.array(itemSchema).min(1);

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
 * Grava a média de valor de mercadoria recalculada (12/18/24 meses,
 * calculada no navegador a partir do arquivo enviado) para cada produto.
 * Faz upsert por produto — produtos não incluídos no upload atual mantêm o
 * valor já salvo anteriormente.
 */
export const atualizarValorMercadoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertApprover(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const agora = new Date().toISOString();
    const linhas = data.map((item) => ({
      produto: item.produto,
      avg: item.avg,
      n: item.n,
      janela_meses: item.janelaMeses,
      updated_at: agora,
      updated_by: context.userId,
    }));

    const { error } = await supabaseAdmin
      .from("valores_mercadoria")
      .upsert(linhas, { onConflict: "produto" });
    if (error) {
      console.error("[atualizarValorMercadoria]", error);
      throw new Error("Não foi possível salvar os novos valores de mercadoria.");
    }
    return { ok: true, total: linhas.length };
  });
