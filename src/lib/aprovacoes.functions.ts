import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid(),
  cliente: z.string().trim().max(200).optional(),
  origem: z.string().trim().max(120).optional(),
  ufOrigem: z.string().trim().max(2).optional(),
  destino: z.string().trim().max(120).optional(),
  ufDestino: z.string().trim().max(2).optional(),
  submittedByEmail: z.string().trim().email().max(160).nullable().optional(),
});

/**
 * Avisa os administradores (profiles.role = 'administrador') que existe uma
 * cotação aguardando aprovação. A lista de destinatários é resolvida no
 * servidor, via supabaseAdmin (bypassa RLS) — nunca recebida do navegador.
 */
export const notificarCotacaoPendente = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("role", "administrador");
    if (adminsError) {
      console.error("[notificarCotacaoPendente] falha ao listar administradores", adminsError);
      return { ok: false };
    }

    const destinatarios = [
      ...new Set((admins ?? []).map((p) => p.email).filter((e): e is string => !!e)),
    ];
    if (destinatarios.length === 0) return { ok: true };

    const templateData = {
      cliente: data.cliente,
      origem: data.origem,
      ufOrigem: data.ufOrigem,
      destino: data.destino,
      ufDestino: data.ufDestino,
      submittedByEmail: data.submittedByEmail ?? undefined,
    };

    const results = await Promise.allSettled(
      destinatarios.map((email) =>
        sendTemplateEmail("cotacao-pendente", email, {
          templateData,
          idempotencyKey: `cotacao-pendente-${data.id}-${email.toLowerCase()}`,
        }),
      ),
    );

    const ok = results.every((r) => r.status === "fulfilled" && r.value.sent);
    if (!ok) {
      console.error(
        "[notificarCotacaoPendente] falha ao enviar para um ou mais administradores",
        results,
      );
    }
    return { ok };
  });
