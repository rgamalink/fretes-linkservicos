import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, ShieldX, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meuAcesso, type AcessoStatus } from "@/lib/acessos";
import { APPROVER_EMAIL } from "@/lib/aprovacoes";
import logoAsset from "@/assets/logo-link.png.asset.json";

export const Route = createFileRoute("/aguardando-aprovacao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso em aprovação | Precificação de Fretes" },
      {
        name: "description",
        content:
          "Seu cadastro no sistema de precificação de fretes aguarda aprovação do administrador para liberar o acesso.",
      },
      { property: "og:title", content: "Acesso em aprovação" },
      {
        property: "og:description",
        content: "Cadastro criado. O acesso será liberado após aprovação do administrador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AguardandoPage,
});

function AguardandoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AcessoStatus | "nao_cadastrado" | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/", replace: true });
        return;
      }
      if (!(data.user.email ?? "").toLowerCase().endsWith("@linkbr.com")) {
        await supabase.auth.signOut();
        if (ativo) setStatus("nao_cadastrado");
        return;
      }
      const s = await meuAcesso(data.user.id);
      if (!ativo) return;
      if (s === "aprovado") navigate({ to: "/cotacao", replace: true });
      else setStatus(s);
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const naoCadastrado = status === "nao_cadastrado";
  const reprovado = status === "reprovado";

  return (
    <main className="min-h-screen bg-background">
      <div
        className="h-2.5 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--accent) 0 28px, transparent 28px 46px)",
        }}
      />
      <div className="mx-auto flex min-h-[calc(100vh-10px)] max-w-[520px] flex-col justify-center px-5 py-10">
        <div className="grid grid-cols-[1fr_140px] overflow-hidden rounded-[10px]">
          <div className="flex flex-col justify-center bg-gradient-to-b from-navy to-navy-2 px-5 py-5">
            <h1 className="text-[17px] font-bold leading-tight tracking-[0.2px] text-primary-foreground">
              Sistema de Precificação de Fretes
            </h1>
            <p className="mt-1 text-xs leading-snug text-primary-foreground/70">
              Acesso liberado somente após aprovação do administrador
            </p>
          </div>
          <div className="flex items-center justify-center bg-white px-4 py-5">
            <img src={logoAsset.url} alt="Link Group" className="h-9 w-auto object-contain" />
          </div>
        </div>

        <section className="mt-4 rounded-[10px] border border-line bg-panel p-6 text-center">
          {reprovado || naoCadastrado ? (
            <ShieldX className="mx-auto size-7 text-danger" />
          ) : (
            <Clock className="mx-auto size-7 text-accent" />
          )}
          <h2 className="mt-3 text-sm font-bold text-ink">
            {naoCadastrado
              ? "Usuário não cadastrado"
              : reprovado
                ? "Acesso não autorizado"
                : "Cadastro aguardando aprovação"}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {naoCadastrado
              ? "Apenas e-mails @linkbr.com têm acesso a este sistema."
              : reprovado
                ? `Seu acesso foi reprovado. Entre em contato com ${APPROVER_EMAIL} para mais informações.`
                : `Seu cadastro foi criado e precisa ser aprovado por ${APPROVER_EMAIL}. Você receberá o acesso assim que a aprovação for registrada.`}
          </p>
          <button
            type="button"
            onClick={sair}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-[7px] bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </section>
      </div>
    </main>
  );
}
