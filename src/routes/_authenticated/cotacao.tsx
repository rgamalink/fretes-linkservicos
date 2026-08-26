import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ClipboardList, LogOut, Plus, Save, Send, Trash2, UserCheck, X } from "lucide-react";
import { decidirAcesso, listarUsuarios, type UsuarioAcesso } from "@/lib/acessos";

import { supabase } from "@/integrations/supabase/client";
import {
  APPROVER_EMAIL,
  decidirSubmissao,
  listarStatusCotacoes,
  listarSubmissoes,
  submeterAprovacao,
  type StatusCotacao,
  type Submissao,
} from "@/lib/aprovacoes";

import logoAsset from "@/assets/logo-link.png.asset.json";
import { FreightCard } from "@/components/FreightCard";
import {
  ANTT_COEF,
  EIXOS_LIST,
  PESO,
  UFS,
  cardVazio,

  cardsVazios,
  formatMoneyValue,
  gerarId,
  geraisVazio,
  getCotacoes,
  maskMoney,
  setCotacoes,
  type Cotacao,
  type DadosCard,
  type DadosGerais,
  type TipoCarga,
} from "@/lib/pricing";
import { buscarValorMedioProduto } from "@/lib/valorMercadoria";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/cotacao")({
  head: () => ({
    meta: [
      { title: "Precificação de Fretes | Cotação 5, 6, 7 e 9 Eixos" },
      {
        name: "description",
        content:
          "Calcule fretes rodoviários com piso ANTT, impostos, pedágio, viabilidade e margem operacional para 5, 6, 7 e 9 eixos.",
      },
      {
        property: "og:title",
        content: "Precificação de Fretes | Cotação Rodoviária",
      },
      {
        property: "og:description",
        content:
          "Cotação simultânea para 5, 6, 7 e 9 eixos com piso ANTT calculado, impostos, viabilidade e margem operacional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fieldCls =
  "w-full rounded-[7px] border border-line bg-panel px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent";
const labelCls = "mb-1.5 block text-xs font-semibold text-ink-soft";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[22px] rounded-xl border border-line bg-panel px-[22px] py-5">
      <h2 className="mb-4 text-[15px] font-bold uppercase tracking-[0.06em] text-ink-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gerais, setGerais] = useState<DadosGerais>(geraisVazio);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }



  const [cards, setCards] = useState<Record<number, DadosCard>>(cardsVazios);
  const [lista, setLista] = useState<Cotacao[]>([]);
  // Id (referência única) da cotação atualmente aberta no painel principal
  const [cotacaoAtualId, setCotacaoAtualId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    msg: string;
    action: () => void;
  } | null>(null);
  const [filtros, setFiltros] = useState({
    cliente: "",
    origem: "",
    destino: "",
    data: "",
  });

  const [email, setEmail] = useState<string | null>(null);
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [statusGeral, setStatusGeral] = useState<StatusCotacao[]>([]);
  const [aprovModalOpen, setAprovModalOpen] = useState(false);
  const [usuariosModalOpen, setUsuariosModalOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[]>([]);
  const usuariosPendentes = usuarios.filter((u) => u.access_status === "pendente").length;

  const carregarUsuarios = async () => {
    try {
      setUsuarios(await listarUsuarios());
    } catch {
      /* sem permissão */
    }
  };

  const decidirUsuario = async (u: UsuarioAcesso, status: "aprovado" | "reprovado") => {
    try {
      await decidirAcesso(u.id, status);
      toast.success(
        status === "aprovado" ? "Acesso aprovado." : "Acesso reprovado.",
      );
      await carregarUsuarios();
    } catch {
      toast.error("Não foi possível registrar a decisão de acesso.");
    }
  };

  const [enviando, setEnviando] = useState(false);
  const [submetidas, setSubmetidas] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("cotacoes_submetidas") ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cotacoes_submetidas", JSON.stringify(submetidas));
    } catch {
      /* armazenamento indisponível */
    }
  }, [submetidas]);


  const isApprover = (email ?? "").toLowerCase() === APPROVER_EMAIL;

  useEffect(() => {
    setLista(getCotacoes());
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    void carregarSubmissoes();
    void carregarUsuarios();
  }, []);

  const carregarSubmissoes = async () => {
    try {
      setSubmissoes(await listarSubmissoes());
    } catch {
      /* sem permissão ou offline */
    }
    try {
      setStatusGeral(await listarStatusCotacoes());
    } catch {
      /* sem permissão ou offline */
    }
  };

  // Cada cotação salva tem um id próprio (ref_local no banco). O status é
  // rastreado por esse id — cotações com cliente/origem/destino iguais são
  // tratadas como cotações distintas.
  // Uma decisão (aprovada/reprovada) sempre prevalece sobre linhas pendentes da
  // mesma cotação, e entre decisões vale a mais recente (decided_at).
  const statusPorCotacao = useMemo(() => {
    const map: Record<string, { status: string; decidedAt: number }> = {};
    for (const s of statusGeral) {
      const chave = s.ref_local;
      if (!chave) continue;
      const decidida = s.status === "aprovada" || s.status === "reprovada";
      const decidedAt = s.decided_at ? new Date(s.decided_at).getTime() : 0;
      const atual = map[chave];
      if (!atual) {
        map[chave] = { status: s.status, decidedAt };
        continue;
      }
      const atualDecidida =
        atual.status === "aprovada" || atual.status === "reprovada";
      if (decidida && (!atualDecidida || decidedAt > atual.decidedAt)) {
        map[chave] = { status: s.status, decidedAt };
      }
    }
    return Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, v.status]),
    ) as Record<string, string>;
  }, [statusGeral]);



  // Decisões tomadas nesta sessão (para marca d'água nos botões clicados)
  const [decisaoUI, setDecisaoUI] = useState<Record<string, "aprovada" | "reprovada">>({});
  const marcaDagua = (ativo: boolean) =>
    ativo ? "opacity-40 saturate-50 pointer-events-none" : "";




  const submeter = async (
    g: DadosGerais,
    c: Record<number, DadosCard>,
    cotacaoId: string,
  ) => {
    if (!g.cliente.trim()) {
      toast.warning("Informe o Nome do Cliente antes de submeter à aprovação.");
      return;
    }
    setEnviando(true);
    try {
      await submeterAprovacao(g, c, "pendente", cotacaoId);
      setSubmetidas((prev) => ({ ...prev, [cotacaoId]: true }));
      toast.success(
        isApprover
          ? "Cotação enviada para o fluxo de aprovação (pendente)."
          : `Cotação submetida à aprovação de ${APPROVER_EMAIL}.`,
      );
      await carregarSubmissoes();
    } catch (err) {
      console.error("Falha ao submeter cotação à aprovação:", err);
      const detalhe = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : null;
      toast.error(
        detalhe
          ? `Não foi possível submeter a cotação à aprovação: ${detalhe}`
          : "Não foi possível submeter a cotação à aprovação.",
      );
    } finally {
      setEnviando(false);
    }
  };


  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  const toggleSelecionado = (id: string) =>
    setSelecionados((prev) => ({ ...prev, [id]: !prev[id] }));

  const submeterSelecionadas = async () => {
    const ids = Object.keys(selecionados).filter((id) => selecionados[id]);
    const itens = lista.filter((c) => ids.includes(c.id) && submetidas[c.id] !== true);
    if (itens.length === 0) return;
    setEnviando(true);
    let ok = 0;
    try {
      for (const item of itens) {
        if (!item.gerais.cliente.trim()) continue;
        try {
          await submeterAprovacao(item.gerais, item.cards, "pendente", item.id);
          setSubmetidas((prev) => ({ ...prev, [item.id]: true }));
          ok++;
        } catch {
          /* segue para as demais */
        }
      }
      if (ok > 0) {
        toast.success(`${ok} cotação(ões) submetida(s) à aprovação de ${APPROVER_EMAIL}.`);
        setSelecionados({});
        await carregarSubmissoes();
      } else {
        toast.error("Não foi possível submeter as cotações selecionadas.");
      }
    } finally {
      setEnviando(false);
    }
  };


  const pendentes = useMemo(
    () => submissoes.filter((s) => s.status === "pendente" || decisaoUI[s.id]),
    [submissoes, decisaoUI],
  );

  // Garante que exista uma cotação com esse id no localStorage deste
  // navegador (sem sobrescrever se já existir), para que ela apareça em
  // "Ver Cotações" mesmo quando o aprovador decide direto pela tela
  // "Cotações para Aprovação", sem nunca ter salvo essa cotação antes.
  const garantirCotacaoLocalComId = (
    id: string,
    salvoEm: string,
    g: DadosGerais,
    c: Record<number, DadosCard>,
  ) => {
    if (getCotacoes().some((x) => x.id === id)) return;
    const nova: Cotacao = { id, salvoEm, gerais: g, cards: c };
    const atual = [nova, ...getCotacoes()];
    if (setCotacoes(atual)) setLista(atual);
  };

  const garantirCotacaoLocal = (s: Submissao) => {
    const dados = s.dados as { gerais?: DadosGerais; cards?: Record<number, DadosCard> } | null;
    if (!dados?.gerais) return;
    garantirCotacaoLocalComId(
      s.ref_local ?? s.id,
      s.created_at,
      dados.gerais,
      Object.fromEntries(
        EIXOS_LIST.map((e) => [e, { ...cardVazio(), ...(dados.cards?.[e] ?? {}) }]),
      ),
    );
  };

  const decidir = async (s: Submissao, status: "aprovada" | "reprovada") => {
    try {
      await decidirSubmissao(s.id, status);
      setDecisaoUI((prev) => ({
        ...prev,
        [s.id]: status,
        ...(s.ref_local ? { [s.ref_local]: status } : {}),
      }));
      garantirCotacaoLocal(s);
      toast.success(status === "aprovada" ? "Cotação aprovada." : "Cotação reprovada.");
      await carregarSubmissoes();
    } catch (err) {
      console.error("Falha ao registrar decisão:", err);
      const detalhe = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : null;
      toast.error(
        detalhe
          ? `Não foi possível registrar a decisão: ${detalhe}`
          : "Não foi possível registrar a decisão.",
      );
    }
  };

  // Aprovador decide direto na aba "Ver Cotações" ou no painel principal.
  // A decisão é sempre amarrada ao id da cotação salva (cotacaoId).
  const decidirLocal = async (
    g: DadosGerais,
    c: Record<number, DadosCard>,
    status: "aprovada" | "reprovada",
    cotacaoId: string,
  ) => {
    if (!g.cliente.trim()) {
      toast.warning("Informe o Nome do Cliente antes de decidir.");
      return;
    }
    setEnviando(true);
    try {
      const existente = submissoes.find((s) => s.ref_local === cotacaoId);
      if (existente) {
        await decidirSubmissao(existente.id, status);
      } else {
        await submeterAprovacao(g, c, status, cotacaoId);
      }
      setDecisaoUI((prev) => ({ ...prev, [cotacaoId]: status }));
      garantirCotacaoLocalComId(cotacaoId, new Date().toISOString(), g, c);
      toast.success(status === "aprovada" ? "Cotação aprovada." : "Cotação reprovada.");
      await carregarSubmissoes();
    } catch (err) {
      console.error("Falha ao registrar decisão:", err);
      const detalhe = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : null;
      toast.error(
        detalhe
          ? `Não foi possível registrar a decisão: ${detalhe}`
          : "Não foi possível registrar a decisão.",
      );
    } finally {
      setEnviando(false);
    }
  };




  const setG = (patch: Partial<DadosGerais>) =>
    setGerais((prev) => ({ ...prev, ...patch }));

  /** Salva a cotação e devolve o id gerado (referência única da cotação). */
  const salvarCotacao = (g: DadosGerais, c: Record<number, DadosCard>) => {
    const nova: Cotacao = {
      id: gerarId(),
      salvoEm: new Date().toISOString(),
      gerais: g,
      cards: c,
    };
    const atual = [nova, ...getCotacoes()];
    if (setCotacoes(atual)) {
      setLista(atual);
      setCotacaoAtualId(nova.id);
      return nova.id;
    }
    return null;
  };


  const salvar = () => {
    if (!gerais.cliente.trim()) {
      toast.warning("Informe o Nome do Cliente antes de salvar.");
      return;
    }
    if (salvarCotacao(gerais, cards)) {
      toast.success("Cotação salva com sucesso.");
    } else {
      toast.error("Não foi possível salvar (armazenamento indisponível).");
    }
  };


  const novaCotacao = () =>
    setConfirm({
      msg: "Isso vai apagar todos os campos preenchidos e começar uma cotação em branco. Deseja continuar?",
      action: () => {
        setGerais(geraisVazio());
        setCards(cardsVazios());
        setCotacaoAtualId(null);
        toast.success("Nova cotação pronta para preenchimento.");
      },
    });

  const carregar = (c: Cotacao) => {
    setGerais({ ...geraisVazio(), ...c.gerais });
    setCards(
      Object.fromEntries(
        EIXOS_LIST.map((e) => [e, { ...cardVazio(), ...(c.cards[e] ?? {}) }]),
      ),
    );
    setCotacaoAtualId(c.id);
    setModalOpen(false);
    toast.success("Cotação carregada.");
  };

  const carregarSubmissao = (s: Submissao) => {
    const dados = s.dados as { gerais?: DadosGerais; cards?: Record<number, DadosCard> } | null;
    if (!dados?.gerais) {
      toast.error("Não foi possível carregar essa cotação.");
      return;
    }
    setGerais({ ...geraisVazio(), ...dados.gerais });
    setCards(
      Object.fromEntries(
        EIXOS_LIST.map((e) => [e, { ...cardVazio(), ...(dados.cards?.[e] ?? {}) }]),
      ),
    );
    setCotacaoAtualId(s.ref_local ?? s.id);
    setAprovModalOpen(false);
    toast.success("Cotação carregada.");
  };


  const apagar = (c: Cotacao) =>
    setConfirm({
      msg: `Tem certeza que deseja apagar a cotação de "${c.gerais.cliente || "esta cotação"}"? Essa ação não pode ser desfeita.`,
      action: () => {
        const atual = getCotacoes().filter((x) => x.id !== c.id);
        if (setCotacoes(atual)) {
          setLista(atual);
          toast.success("Cotação apagada.");
        } else {
          toast.error("Não foi possível apagar a cotação.");
        }
      },
    });

  const filtrada = useMemo(
    () =>
      lista.filter((item) => {
        const g = item.gerais;
        const f = filtros;
        if (f.cliente && !(g.cliente || "").toLowerCase().includes(f.cliente.toLowerCase()))
          return false;
        if (f.origem && !(g.origem || "").toLowerCase().includes(f.origem.toLowerCase()))
          return false;
        if (
          f.destino &&
          !(g.destino || "").toLowerCase().includes(f.destino.toLowerCase())
        )
          return false;
        if (f.data) {
          const datas = Object.values(item.cards).map((c) => c.data);
          if (!datas.includes(f.data)) return false;
        }
        return true;
      }),
    [lista, filtros],
  );

  const selecionaveis = useMemo(
    () => filtrada.filter((c) => submetidas[c.id] !== true),
    [filtrada, submetidas],
  );

  const totalSelecionadas = useMemo(
    () => selecionaveis.filter((c) => selecionados[c.id] === true).length,
    [selecionaveis, selecionados],
  );


  return (
    <div className="min-h-screen bg-background">
      <div
        className="h-2.5 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--accent) 0 28px, transparent 28px 46px)",
        }}
      />
      <div className="bg-panel py-4">
        <div className="mx-auto max-w-[1440px] px-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-gradient-to-b from-navy to-navy-2 px-6 py-3">
            <div>
              <h1 className="text-[17px] font-bold tracking-[0.2px] text-primary-foreground">
                Sistema de Precificação de Fretes — Transporte Rodoviário de Cargas
              </h1>
              <p className="mt-1 text-xs text-primary-foreground/70">
                Cotação simultânea para 5, 6, 7 e 9 eixos · piso ANTT calculado ·
                impostos · viabilidade · margem operacional
              </p>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={logoAsset.url}
                alt="Link Group"
                className="h-11 w-auto object-contain"
              />
              <button
                type="button"
                onClick={sair}
                className="flex items-center gap-1.5 rounded-[7px] border border-primary-foreground/25 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                <LogOut className="size-3.5" />
                Sair
              </button>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 pb-15">
        <Panel title="Dados da Cotação (aplicam-se aos 4 cards)">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-4 gap-y-2.5">
            <div>
              <label className={labelCls}>Nome do Cliente</label>
              <input
                className={fieldCls}
                placeholder="Ex.: Distribuidora ABC Ltda"
                value={gerais.cliente}
                onChange={(e) => setG({ cliente: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Origem</label>
              <input
                className={fieldCls}
                placeholder="Ex.: Belo Horizonte"
                value={gerais.origem}
                onChange={(e) => setG({ origem: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>UF Origem</label>
              <select
                className={fieldCls}
                value={gerais.ufOrigem}
                onChange={(e) => setG({ ufOrigem: e.target.value })}
              >
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Destino</label>
              <input
                className={fieldCls}
                placeholder="Ex.: São Paulo"
                value={gerais.destino}
                onChange={(e) => setG({ destino: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>UF Destino</label>
              <select
                className={fieldCls}
                value={gerais.ufDestino}
                onChange={(e) => setG({ ufDestino: e.target.value })}
              >
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Distância (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                className={fieldCls}
                value={gerais.distancia}
                onChange={(e) => setG({ distancia: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Produto</label>
              <input
                className={fieldCls}
                placeholder="Ex.: Minério"
                value={gerais.produto}
                onChange={(e) => {
                  const produto = e.target.value;
                  const valorMedio = buscarValorMedioProduto(produto);
                  setG({
                    produto,
                    ...(valorMedio !== null
                      ? { valorCarga: formatMoneyValue(valorMedio) }
                      : {}),
                  });
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Tipo de Carga</label>
              <select
                className={fieldCls}
                value={gerais.tipo}
                onChange={(e) => setG({ tipo: e.target.value as TipoCarga })}
              >
                <option value="granel">Granel Sólido</option>
                <option value="geral">Carga Geral</option>
                <option value="container">Container</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor da Carga (R$/ton)</label>
              <input
                inputMode="decimal"
                placeholder="0,00"
                className={fieldCls}
                value={gerais.valorCarga}
                onChange={(e) => setG({ valorCarga: maskMoney(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>PF ou PJ</label>
              <select
                className={fieldCls}
                value={gerais.pfpj}
                onChange={(e) => setG({ pfpj: e.target.value as "PF" | "PJ" })}
              >
                <option value="PF">PF</option>
                <option value="PJ">PJ</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>ICMS (%)</label>
              <input
                inputMode="decimal"
                placeholder="0,00"
                className={fieldCls}
                value={gerais.icms}
                onChange={(e) => setG({ icms: maskMoney(e.target.value) })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={salvar}
              className="rounded-[7px] border border-navy bg-navy px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-navy-2"
            >
              <Save className="mr-2 inline h-4 w-4 align-[-3px]" />Salvar Cotação
            </button>
            <button
              type="button"
              onClick={novaCotacao}
              className="rounded-[7px] border border-line bg-panel px-4 py-2.5 text-[13px] font-bold text-ink transition-colors hover:bg-secondary"
            >
              <Plus className="mr-2 inline h-4 w-4 align-[-3px]" />Nova Cotação
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-[7px] border border-accent bg-accent px-4 py-2.5 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent-dark"
            >
              <ClipboardList className="mr-2 inline h-4 w-4 align-[-3px]" />Ver Cotações
            </button>
            {(() => {
              const idAtual = cotacaoAtualId;
              const jaEnviada =
                !isApprover && idAtual !== null && submetidas[idAtual] === true;
              const aprovada =
                isApprover &&
                idAtual !== null &&
                (decisaoUI[idAtual] ?? statusPorCotacao[idAtual]) === "aprovada";
              const acao = () => {
                if (!gerais.cliente.trim()) {
                  toast.warning("Informe o Nome do Cliente antes de continuar.");
                  return;
                }
                // Cada cotação precisa de um id próprio: se ainda não foi salva,
                // salva agora para gerar a referência.
                const id = idAtual ?? salvarCotacao(gerais, cards);
                if (!id) {
                  toast.error("Não foi possível salvar a cotação (armazenamento indisponível).");
                  return;
                }
                void (isApprover
                  ? decidirLocal(gerais, cards, "aprovada", id)
                  : submeter(gerais, cards, id));
              };
              return (
                <button
                  type="button"
                  disabled={enviando || jaEnviada}
                  onClick={acao}

                  className={`rounded-[7px] border border-navy bg-panel px-4 py-2.5 text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 ${marcaDagua(aprovada)}`}
                >
                  {isApprover ? (
                    <>
                      <Check className="mr-2 inline h-4 w-4 align-[-3px]" />Aprovar
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 inline h-4 w-4 align-[-3px]" />
                      {jaEnviada ? "Submetida a aprovação" : "Submeter a aprovação"}
                    </>
                  )}
                </button>
              );
            })()}

            {isApprover && (() => {
              const idAtual = cotacaoAtualId;
              const reprovada =
                idAtual !== null &&
                (decisaoUI[idAtual] ?? statusPorCotacao[idAtual]) === "reprovada";
              return (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => {
                    const id = idAtual ?? salvarCotacao(gerais, cards);
                    if (!id) {
                      toast.error("Não foi possível salvar a cotação (armazenamento indisponível).");
                      return;
                    }
                    void decidirLocal(gerais, cards, "reprovada", id);
                  }}
                  className={`rounded-[7px] border border-danger bg-panel px-4 py-2.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 ${marcaDagua(reprovada)}`}
                >
                  <X className="mr-2 inline h-4 w-4 align-[-3px]" />Reprovar
                </button>
              );
            })()}

            {isApprover && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAprovModalOpen(true);
                    void carregarSubmissoes();
                  }}
                  className="rounded-[7px] border border-navy bg-panel px-4 py-2.5 text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-primary-foreground"
                >
                  <ClipboardList className="mr-2 inline h-4 w-4 align-[-3px]" />Cotações para Aprovação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsuariosModalOpen(true);
                    void carregarUsuarios();
                  }}
                  className="rounded-[7px] border border-navy bg-panel px-4 py-2.5 text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-primary-foreground"
                >
                  <UserCheck className="mr-2 inline h-4 w-4 align-[-3px]" />Aprovação de Logins
                  {usuariosPendentes > 0 && (
                    <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-[11px] text-primary-foreground">
                      {usuariosPendentes}
                    </span>
                  )}
                </button>
              </>
            )}

          </div>
        </Panel>

        <div className="mt-[22px] grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-4">
          {EIXOS_LIST.map((eixos) => (
            <FreightCard
              key={eixos}
              eixos={eixos}
              gerais={gerais}
              card={cards[eixos]!}
              onChange={(patch) =>
                setCards((prev) => ({
                  ...prev,
                  [eixos]: { ...prev[eixos]!, ...patch },
                }))
              }
            />
          ))}
        </div>

        <Panel title="Premissas assumidas">
          <div className="rounded-[10px] border border-warn-line bg-warn-bg px-4 py-3.5 text-[12.5px] leading-relaxed text-warn-ink">
            <b>Premissas assumidas — leia antes de usar:</b>
            <ul className="mt-1.5 list-disc pl-5">
              <li>
                <b>Tabela ANTT (piso)</b> = (Distância × Deslocamento) + Carga e
                Descarga, com coeficientes por eixo e tipo de carga listados abaixo.
                Se a portaria SUROC reajustar os coeficientes, atualize a tabela.
              </li>
              <li>
                <b>Tabela ANTT Motorista</b> = Tabela ANTT ÷ (1 − % SEST/SENAT), sendo
                2,7% para PF e 0% para PJ.
              </li>
              <li>
                <b>SEST/SENAT + INSS</b> só se aplica ao cálculo acima; não há desconto
                separado em outro campo.
              </li>
              <li>
                <b>Efrete/Pamcard</b> usa a UF de Origem: se MG, Frete Motorista×0,32% +
                Pedágio×0,50%; nas demais UFs, Frete Motorista×0,70%.
              </li>
              <li>
                <b>Margem Operacional (%)</b> = Margem (R$/ton) ÷ Frete Empresa (R$/ton).
              </li>
              <li>
                <b>Pedágio</b> é um campo por card, pois o valor muda por eixo do
                veículo.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel title='Coeficientes ANTT usados no cálculo'>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {(Object.keys(ANTT_COEF) as TipoCarga[]).map((key) => (
              <div key={key}>
                <div className="mb-1.5 text-[13px] font-bold">
                  {ANTT_COEF[key].label}
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-ink-soft">
                      <th className="px-2 py-1">Eixos</th>
                      <th className="px-2 py-1">Peso (ton)</th>
                      <th className="px-2 py-1 text-right">Deslocamento (R$/km)</th>
                      <th className="px-2 py-1 text-right">Carga e Descarga (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EIXOS_LIST.map((ei) => (
                      <tr key={ei}>
                        <td className="border-b border-line px-2 py-1">{ei}</td>
                        <td className="border-b border-line px-2 py-1">{PESO[ei]}</td>
                        <td className="border-b border-line px-2 py-1 text-right tabular-nums">
                          {ANTT_COEF[key][ei]!.desloc.toLocaleString("pt-BR", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="border-b border-line px-2 py-1 text-right tabular-nums">
                          {ANTT_COEF[key][ei]!.cd.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <footer className="px-6 pt-6 pb-10 text-center text-xs text-ink-soft">
        Sistema gerado para uso interno. Os coeficientes de piso ANTT devem ser
        conferidos periodicamente contra a portaria SUROC vigente.
      </footer>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[1400px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Cotações Salvas</DialogTitle>
          </DialogHeader>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <input
              className={fieldCls}
              aria-label="Filtrar por cliente"
              placeholder="Filtrar por cliente"
              value={filtros.cliente}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
            />
            <input
              className={fieldCls}
              aria-label="Filtrar por origem"
              placeholder="Filtrar por origem"
              value={filtros.origem}
              onChange={(e) => setFiltros({ ...filtros, origem: e.target.value })}
            />
            <input
              className={fieldCls}
              aria-label="Filtrar por destino"
              placeholder="Filtrar por destino"
              value={filtros.destino}
              onChange={(e) => setFiltros({ ...filtros, destino: e.target.value })}
            />
            <input
              type="date"
              aria-label="Filtrar por data"
              className={fieldCls}
              value={filtros.data}
              onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
            />
          </div>
          {!isApprover && filtrada.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-navy">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={
                    selecionaveis.length > 0 &&
                    selecionaveis.every((c) => selecionados[c.id])
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const next: Record<string, boolean> = { ...selecionados };
                      for (const c of selecionaveis) next[c.id] = true;
                      setSelecionados(next);
                    } else {
                      setSelecionados({});
                    }
                  }}
                />
                Selecionar todas
              </label>
              {totalSelecionadas > 1 && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={submeterSelecionadas}
                  className="rounded-[5px] border border-navy bg-navy px-3 py-1.5 text-[11.5px] font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                  Submeter todas as cotações selecionadas ({totalSelecionadas})
                </button>
              )}
            </div>
          )}
          {filtrada.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-ink-soft">
              Nenhuma cotação encontrada.
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full min-w-max border-collapse whitespace-nowrap text-[12.5px]">
                <thead>
                  <tr className="text-left text-ink-soft">
                    {!isApprover && <th className="border-b-2 border-line p-2" />}
                    <th className="border-b-2 border-line p-2">Ref.</th>
                    <th className="border-b-2 border-line p-2">Cliente</th>
                    <th className="border-b-2 border-line p-2">Origem</th>
                    <th className="border-b-2 border-line p-2">Destino</th>
                    <th className="border-b-2 border-line p-2">Salvo em</th>
                    <th className="border-b-2 border-line p-2">Status</th>
                    <th className="border-b-2 border-line p-2">Eixos Aprovados</th>
                    <th className="border-b-2 border-line p-2">PF/PJ</th>
                    <th className="border-b-2 border-line p-2" colSpan={2}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filtrada.map((item) => {
                    const chaveItem = item.id;
                    const statusCotacao =
                      decisaoUI[chaveItem] ?? statusPorCotacao[chaveItem] ?? "pendente";

                    const statusColorClass =
                      statusCotacao === "aprovada"
                        ? "text-success"
                        : statusCotacao === "reprovada"
                          ? "text-danger"
                          : "text-ink-soft";

                    const eixosAprovados = EIXOS_LIST.filter((eixos) =>
                      item.cards[eixos]?.status.startsWith("Aprovado"),
                    );
                    return (
                      <tr key={item.id} className="hover:bg-secondary">
                        {!isApprover && (
                          <td className="border-b border-line p-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-navy"
                              aria-label={`Marcar cotação de ${item.gerais.cliente || "cliente"}`}
                              disabled={submetidas[item.id] === true}
                              checked={selecionados[item.id] === true}
                              onChange={() => toggleSelecionado(item.id)}
                            />
                          </td>
                        )}
                        <td className="border-b border-line p-2 font-mono text-[11px] text-ink-soft" title={item.id}>
                          {item.id.slice(-8)}
                        </td>
                        <td className="border-b border-line p-2">
                          {item.gerais.cliente || "—"}
                        </td>
                        <td className="border-b border-line p-2">
                          {item.gerais.origem || "—"}
                          {item.gerais.ufOrigem ? "/" + item.gerais.ufOrigem : ""}
                        </td>
                        <td className="border-b border-line p-2">
                          {item.gerais.destino || "—"}
                          {item.gerais.ufDestino ? "/" + item.gerais.ufDestino : ""}
                        </td>
                        <td className="border-b border-line p-2">
                          {new Date(item.salvoEm).toLocaleString("pt-BR")}
                        </td>
                        <td className={`border-b border-line p-2 font-semibold capitalize ${statusColorClass}`}>
                          {statusCotacao}
                        </td>
                        <td className="border-b border-line p-2">
                          {eixosAprovados.length > 0
                            ? eixosAprovados.map((e) => `${e} eixos`).join(", ")
                            : "—"}
                        </td>
                        <td className="border-b border-line p-2">
                          {item.gerais.pfpj}
                        </td>
                        <td className="border-b border-line p-2">
                          <button
                            type="button"
                            onClick={() => carregar(item)}
                            className="rounded-[5px] border border-navy bg-panel px-3 py-1 text-[11.5px] font-bold text-navy hover:bg-navy hover:text-primary-foreground"
                          >
                            Carregar
                          </button>
                        </td>
                        <td className="border-b border-line p-2">
                          {!isApprover && (
                            <div className="flex gap-2">
                              {submetidas[item.id] !== true && (
                                <button
                                  type="button"
                                  onClick={() => apagar(item)}
                                  className="rounded-[5px] border border-danger bg-panel px-3 py-1 text-[11.5px] font-bold text-danger hover:bg-danger hover:text-primary-foreground"
                                >
                                  <Trash2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Apagar
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={enviando || submetidas[item.id] === true}
                                onClick={() => submeter(item.gerais, item.cards, item.id)}
                                className="rounded-[5px] border border-navy bg-panel px-3 py-1 text-[11.5px] font-bold text-navy hover:bg-navy hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Send className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                {submetidas[item.id] === true
                                  ? "Submetida a aprovação"
                                  : "Submeter a aprovação"}
                              </button>
                            </div>
                          )}
                          {isApprover && (
                            <button
                              type="button"
                              onClick={() => apagar(item)}
                              className="rounded-[5px] border border-danger bg-panel px-3 py-1 text-[11.5px] font-bold text-danger hover:bg-danger hover:text-primary-foreground"
                            >
                              <Trash2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Apagar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={aprovModalOpen} onOpenChange={setAprovModalOpen}>
        <DialogContent className="max-w-[1400px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Cotações Submetidas à Aprovação</DialogTitle>
          </DialogHeader>
          {pendentes.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-ink-soft">
              Nenhuma cotação pendente de aprovação.
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full min-w-max border-collapse whitespace-nowrap text-[12.5px]">
                <thead>
                  <tr className="text-left text-ink-soft">
                    <th className="border-b-2 border-line p-2">Ref.</th>
                    <th className="border-b-2 border-line p-2">Cliente</th>
                    <th className="border-b-2 border-line p-2">Origem</th>
                    <th className="border-b-2 border-line p-2">Destino</th>
                    <th className="border-b-2 border-line p-2">Enviado por</th>
                    <th className="border-b-2 border-line p-2">Enviado em</th>
                    <th className="border-b-2 border-line p-2">Status</th>
                    <th className="border-b-2 border-line p-2" />
                    <th className="border-b-2 border-line p-2" colSpan={2} />
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map((s) => (
                    <tr key={s.id} className="hover:bg-secondary">
                      <td
                        className="border-b border-line p-2 font-mono text-[11px] text-ink-soft"
                        title={s.ref_local ?? s.id}
                      >
                        {(s.ref_local ?? s.id).slice(-8)}
                      </td>
                      <td className="border-b border-line p-2">{s.cliente || "—"}</td>
                      <td className="border-b border-line p-2">
                        {s.origem || "—"}
                        {s.uf_origem ? "/" + s.uf_origem : ""}
                      </td>
                      <td className="border-b border-line p-2">
                        {s.destino || "—"}
                        {s.uf_destino ? "/" + s.uf_destino : ""}
                      </td>
                      <td className="border-b border-line p-2">
                        {s.submitted_by_email || "—"}
                      </td>
                      <td className="border-b border-line p-2">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </td>
                      {(() => {
                        const st = decisaoUI[s.id] ?? s.status;
                        return (
                          <td
                            className={`border-b border-line p-2 font-semibold capitalize ${
                              st === "aprovada"
                                ? "text-success"
                                : st === "reprovada"
                                  ? "text-danger"
                                  : "text-ink-soft"
                            }`}
                          >
                            {st}
                          </td>
                        );
                      })()}
                      <td className="border-b border-line p-2">
                        <button
                          type="button"
                          onClick={() => carregarSubmissao(s)}
                          className="rounded-[5px] border border-navy bg-panel px-3 py-1 text-[11.5px] font-bold text-navy hover:bg-navy hover:text-primary-foreground"
                        >
                          Carregar
                        </button>
                      </td>
                      <td className="border-b border-line p-2">
                        <button
                          type="button"
                          onClick={() => decidir(s, "aprovada")}
                          className={`rounded-[5px] border border-navy bg-panel px-3 py-1 text-[11.5px] font-bold text-navy hover:bg-navy hover:text-primary-foreground ${marcaDagua(decisaoUI[s.id] === "aprovada")}`}
                        >
                          Aprovar
                        </button>
                      </td>
                      <td className="border-b border-line p-2">
                        <button
                          type="button"
                          onClick={() => decidir(s, "reprovada")}
                          className={`rounded-[5px] border border-danger bg-panel px-3 py-1 text-[11.5px] font-bold text-danger hover:bg-danger hover:text-primary-foreground ${marcaDagua(decisaoUI[s.id] === "reprovada")}`}
                        >
                          Reprovar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={usuariosModalOpen} onOpenChange={setUsuariosModalOpen}>
        <DialogContent className="max-w-[1200px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Aprovação de Logins</DialogTitle>
          </DialogHeader>
          {usuarios.length === 0 ? (
            <p className="text-[13px] text-ink-soft">Nenhum cadastro encontrado.</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-max border-collapse whitespace-nowrap text-[13px]">
                <thead>
                  <tr className="text-left text-ink-soft">
                    <th className="border-b border-line p-2">E-mail</th>
                    <th className="border-b border-line p-2">Nome</th>
                    <th className="border-b border-line p-2">Empresa</th>
                    <th className="border-b border-line p-2">Cadastro</th>
                    <th className="border-b border-line p-2">Status</th>
                    <th className="border-b border-line p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary">
                      <td className="border-b border-line p-2">{u.email || "—"}</td>
                      <td className="border-b border-line p-2">{u.full_name || "—"}</td>
                      <td className="border-b border-line p-2">{u.company || "—"}</td>
                      <td className="border-b border-line p-2">
                        {new Date(u.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td
                        className={`border-b border-line p-2 font-semibold capitalize ${
                          u.access_status === "aprovado"
                            ? "text-success"
                            : u.access_status === "reprovado"
                              ? "text-danger"
                              : "text-ink-soft"
                        }`}
                      >
                        {u.access_status}
                      </td>
                      <td className="border-b border-line p-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={u.access_status === "aprovado"}
                            onClick={() => void decidirUsuario(u, "aprovado")}
                            className="rounded-[6px] bg-navy px-3 py-1.5 text-[12px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            disabled={u.access_status === "reprovado"}
                            onClick={() => void decidirUsuario(u, "reprovado")}
                            className="rounded-[6px] border border-line px-3 py-1.5 text-[12px] font-bold text-danger transition-colors hover:bg-secondary disabled:opacity-40"
                          >
                            Reprovar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.msg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={() => {
                confirm?.action();
                setConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
