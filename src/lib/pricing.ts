import { supabase } from "@/integrations/supabase/client";

export const PESO_BASELINE: Record<number, number> = { 5: 26, 6: 30, 7: 39, 9: 48 };
export const EIXOS_LIST = [5, 6, 7, 9] as const;

export type TipoCarga = "granel" | "geral" | "container";

export const ANTT_COEF_BASELINE: Record<
  TipoCarga,
  { label: string } & Record<number, { desloc: number; cd: number }>
> = {
  granel: {
    label: "Granel Sólido",
    5: { desloc: 6.6983, cd: 664.83 },
    6: { desloc: 7.3841, cd: 680.01 },
    7: { desloc: 8.0516, cd: 820.34 },
    9: { desloc: 9.2231, cd: 908.91 },
  },
  geral: {
    label: "Carga Geral",
    5: { desloc: 6.6718, cd: 657.56 },
    6: { desloc: 7.3547, cd: 671.93 },
    7: { desloc: 8.0927, cd: 831.66 },
    9: { desloc: 9.2027, cd: 903.32 },
  },
  container: {
    label: "Container",
    5: { desloc: 6.6345, cd: 647.29 },
    6: { desloc: 7.3186, cd: 662.01 },
    7: { desloc: 8.0492, cd: 819.69 },
    9: { desloc: 9.1399, cd: 886.05 },
  },
};

// PESO e ANTT_COEF começam iguais aos valores de partida (baseline) acima e
// são reatribuídos (o objeto inteiro, não mutado campo a campo) assim que um
// administrador salva uma edição em "Atualizar Índices ANTT" ou quando
// carregarAnttCoeficientesSalvos() traz o que já foi salvo antes. Como todo
// módulo que importa PESO/ANTT_COEF lê o valor atual do binding a cada
// chamada de função (nunca guarda uma cópia), a reatribuição aqui já basta
// para propagar — não precisa de um deploy novo.
export let PESO: Record<number, number> = { ...PESO_BASELINE };
export let ANTT_COEF: Record<
  TipoCarga,
  { label: string } & Record<number, { desloc: number; cd: number }>
> = structuredClone(ANTT_COEF_BASELINE);

export interface AnttCoeficientesEditaveis {
  peso: Record<number, number>;
  coef: Record<TipoCarga, Record<number, { desloc: number; cd: number }>>;
}

/** Aplica por cima do baseline os índices ANTT editados por um administrador. */
export function aplicarAnttCoeficientesAtualizados(dados: AnttCoeficientesEditaveis) {
  PESO = { ...dados.peso };
  ANTT_COEF = {
    granel: { label: ANTT_COEF_BASELINE.granel.label, ...dados.coef.granel },
    geral: { label: ANTT_COEF_BASELINE.geral.label, ...dados.coef.geral },
    container: { label: ANTT_COEF_BASELINE.container.label, ...dados.coef.container },
  };
}

/** Busca na tabela antt_coeficientes o que já foi salvo por uma edição anterior. */
export async function carregarAnttCoeficientesSalvos(): Promise<void> {
  const { data, error } = await supabase
    .from("antt_coeficientes")
    .select("dados")
    .eq("id", "default")
    .maybeSingle();
  if (error || !data?.dados) return;
  aplicarAnttCoeficientesAtualizados(data.dados as unknown as AnttCoeficientesEditaveis);
}

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function brl(v: number) {
  if (!isFinite(v)) v = 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(v: number) {
  if (!isFinite(v)) v = 0;
  return (
    (v * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

export function parseMoney(str: string | number | undefined | null) {
  if (!str) return 0;
  const cleaned = String(str)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}

export function formatMoneyValue(num: number) {
  if (!isFinite(num)) num = 0;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Aplica máscara de dinheiro pt-BR sobre a digitação bruta. */
export function maskMoney(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return formatMoneyValue(parseInt(digits, 10) / 100);
}

export type DadosGerais = {
  cliente: string;
  origem: string;
  ufOrigem: string;
  destino: string;
  ufDestino: string;
  distancia: string;
  produto: string;
  tipo: TipoCarga;
  valorCarga: string;
  pfpj: "PF" | "PJ";
  icms: string;
  retornoVazio: boolean;
};

export type DadosCard = {
  freteEmpresaR: string;
  freteEmpresaTon: string;
  pedagio: string;
  freteMotoristaR: string;
  freteMotoristaTon: string;
  data: string;
  status: string;
};

export const geraisVazio = (): DadosGerais => ({
  cliente: "",
  origem: "",
  ufOrigem: "MG",
  destino: "",
  ufDestino: "",
  distancia: "",
  produto: "",
  tipo: "granel",
  valorCarga: "",
  pfpj: "PF",
  icms: "",
  retornoVazio: false,
});

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export const cardVazio = (): DadosCard => ({
  freteEmpresaR: "",
  freteEmpresaTon: "",
  pedagio: "",
  freteMotoristaR: "",
  freteMotoristaTon: "",
  data: hojeISO(),
  status: "Aguardando decisão",
});

export const cardsVazios = (): Record<number, DadosCard> =>
  Object.fromEntries(EIXOS_LIST.map((e) => [e, cardVazio()]));

export function calcular(eixos: number, gerais: DadosGerais, card: DadosCard) {
  const peso = PESO[eixos]!;
  const coef = ANTT_COEF[gerais.tipo][eixos]!;

  const distancia = parseFloat(gerais.distancia) || 0;
  const sestPct = gerais.pfpj === "PF" ? 0.027 : 0;
  const valorCarga = parseMoney(gerais.valorCarga);
  const icmsPct = parseMoney(gerais.icms) / 100;

  const anttBaseR = distancia > 0 ? distancia * coef.desloc + coef.cd : 0;
  const retornoVazio = gerais.tipo === "container" && gerais.retornoVazio;
  const anttR = retornoVazio ? anttBaseR + distancia * coef.desloc * 0.92 : anttBaseR;
  const anttMotR = distancia > 0 ? anttR / (1 - sestPct) : 0;

  const freR = parseMoney(card.freteEmpresaR);
  const freTon = freR / peso;
  const pedagioR = parseMoney(card.pedagio);
  const anttPedR = anttMotR + pedagioR;

  const fmTon = parseMoney(card.freteMotoristaTon);
  const fmR = fmTon * peso;

  const icmsR = freR * icmsPct;
  // Seguro = (Valor da Carga (R$/ton) × 0,011%) × 2 — total em R$, sem
  // multiplicar pelo peso (o R$/ton exibido no card é esse total ÷ peso).
  const segR = valorCarga * 0.00011 * 2;

  // Efrete/Pamcard = 0,32% do Frete Motorista + 0,50% do Pedágio, igual em
  // qualquer UF de origem.
  const efrR = fmR * 0.0032 + pedagioR * 0.005;

  const pisR = (freR - fmR - efrR - segR - icmsR) * 0.0925;
  const saldoR = freR - icmsR - pisR - segR - efrR;
  const fmpR = fmR + pedagioR;

  const viavel = fmR >= anttMotR;
  const moR = saldoR - fmpR;
  const moTon = moR / peso;
  const moPct = freTon !== 0 ? moTon / freTon : 0;

  return {
    peso,
    coef,
    sestPct,
    anttR,
    anttTon: anttR / peso,
    anttMotR,
    anttMotTon: anttMotR / peso,
    freR,
    freTon,
    pedagioR,
    pedagioTon: pedagioR / peso,
    anttPedR,
    anttPedTon: anttPedR / peso,
    icmsR,
    pisR,
    segR,
    efrR,
    saldoR,
    fmR,
    fmpR,
    viavel,
    moR,
    moTon,
    moPct,
  };
}

export type Cotacao = {
  id: string;
  salvoEm: string;
  gerais: DadosGerais;
  cards: Record<number, DadosCard>;
};
