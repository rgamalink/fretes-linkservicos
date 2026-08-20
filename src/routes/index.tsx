import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { notificarNovoCadastro } from "@/lib/notificacoes.functions";
import logoAsset from "@/assets/logo-link.png.asset.json";

function destinoSeguro(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//"))
    return null;
  return next;
}

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = destinoSeguro(s['next']);
    return next ? { next } : {};
  },

  head: () => ({
    meta: [
      { title: "Acessar | Sistema de Precificação de Fretes" },
      {
        name: "description",
        content:
          "Entre com e-mail e senha para acessar o sistema de precificação de fretes rodoviários com piso ANTT.",
      },
      { property: "og:title", content: "Acessar o Sistema de Precificação de Fretes" },
      {
        property: "og:description",
        content:
          "Login do sistema de cotação de fretes rodoviários para 5, 6, 7 e 9 eixos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const fieldCls =
  "w-full rounded-[7px] border border-line bg-panel px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent";
const labelCls = "mb-1.5 block text-xs font-semibold text-ink-soft";

const credenciaisSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Informe um e-mail válido" })
    .max(255, { message: "E-mail muito longo" })
    .refine((email) => email.toLowerCase().endsWith("@linkbr.com"), {
      message: "Usuário não cadastrado.",
    }),
  senha: z
    .string()
    .min(6, { message: "A senha deve ter ao menos 6 caracteres" })
    .max(72, { message: "Senha muito longa" }),
});

const cadastroSchema = credenciaisSchema.extend({
  nome: z
    .string()
    .trim()
    .min(2, { message: "Informe seu nome" })
    .max(100, { message: "Nome muito longo" }),
  empresa: z.string().trim().max(120, { message: "Nome da empresa muito longo" }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  function irParaDestino() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/cotacao", replace: true });
  }
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (data.session) irParaDestino();
      else setVerificando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) irParaDestino();
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (carregando) return;

    if (modo === "login") {
      const parsed = credenciaisSchema.safeParse({ email, senha });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      setCarregando(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.senha,
      });
      setCarregando(false);
      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : "Não foi possível entrar. Tente novamente.",
        );
        return;
      }
      toast.success("Bem-vindo de volta!");
      irParaDestino();
      return;
    }

    const parsed = cadastroSchema.safeParse({ email, senha, nome, empresa });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        emailRedirectTo: window.location.origin + (next ?? ""),
        data: { full_name: parsed.data.nome, company: parsed.data.empresa },
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já possui cadastro. Faça login."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      return;
    }
    // Avisa o aprovador por e-mail (não bloqueia o cadastro se falhar)
    void notificarNovoCadastro({
      data: {
        email: parsed.data.email,
        nome: parsed.data.nome,
        empresa: parsed.data.empresa,
      },
    }).catch(() => undefined);

    if (!data.session) {
      toast.success("Conta criada! O acesso será liberado após aprovação do administrador.");
      setModo("login");
      return;
    }
    toast.success("Conta criada! Aguarde a aprovação do administrador.");
    irParaDestino();
  }

  if (verificando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-accent" aria-label="Carregando" />
      </main>
    );
  }

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
              Transporte Rodoviário de Cargas · piso ANTT · impostos · margem
            </p>
          </div>
          <div className="flex items-center justify-center bg-white px-4 py-5">
            <img
              src={logoAsset.url}
              alt="Link Group"
              className="h-9 w-auto object-contain"
            />
          </div>
        </div>

        <section className="mt-4 rounded-[10px] border border-line bg-panel p-6">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-accent" />
            <h2 className="text-xs font-bold tracking-[1px] text-ink uppercase">
              {modo === "login" ? "Acessar o sistema" : "Criar conta"}
            </h2>
          </div>

          <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
            {modo === "cadastro" && (
              <>
                <div>
                  <label className={labelCls} htmlFor="nome">
                    Nome completo
                  </label>
                  <input
                    id="nome"
                    className={fieldCls}
                    value={nome}
                    maxLength={100}
                    autoComplete="name"
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Maria Souza"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="empresa">
                    Empresa (opcional)
                  </label>
                  <input
                    id="empresa"
                    className={fieldCls}
                    value={empresa}
                    maxLength={120}
                    autoComplete="organization"
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ex.: Transportes Alfa"
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelCls} htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className={fieldCls}
                value={email}
                maxLength={255}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                className={fieldCls}
                value={senha}
                maxLength={72}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-[7px] bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {carregando && <Loader2 className="size-4 animate-spin" />}
              {modo === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-ink-soft">
            {modo === "login" ? "Não tem conta?" : "Já possui conta?"}{" "}
            <button
              type="button"
              className="font-semibold text-accent-dark underline-offset-2 hover:underline"
              onClick={() => setModo(modo === "login" ? "cadastro" : "login")}
            >
              {modo === "login" ? "Criar agora" : "Fazer login"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
