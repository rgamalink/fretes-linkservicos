export const PESO: Record<number, number> = { 5: 26, 6: 30, 7: 39, 9: 48 };
export const EIXOS_LIST = [5, 6, 7, 9] as const;

export type TipoCarga = "granel" | "geral" | "container";

export const ANTT_COEF: Record<
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

  const anttR = distancia > 0 ? distancia * coef.desloc + coef.cd : 0;
  const anttMotR = distancia > 0 ? anttR / (1 - sestPct) : 0;

  const freR = parseMoney(card.freteEmpresaR);
  const freTon = freR / peso;
  const pedagioR = parseMoney(card.pedagio);
  const anttPedR = anttMotR + pedagioR;

  const fmTon = parseMoney(card.freteMotoristaTon);
  const fmR = fmTon * peso;

  const icmsR = freR * icmsPct;
  const segR = valorCarga * peso * 0.00022;

  const efrR =
    gerais.ufOrigem === "MG"
      ? fmR * 0.0032 + pedagioR * 0.005
      : fmR * 0.007;

  const pisR = (freR - pedagioR - fmR - icmsR - segR - efrR) * 0.0925;
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

const STORAGE_KEY = "linkgroup_cotacoes_v1";

export function getCotacoes(): Cotacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cotacao[]) : [];
  } catch {
    return [];
  }
}

export function setCotacoes(lista: Cotacao[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

export function gerarId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "cot_" + crypto.randomUUID();
  }
  return "cot_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}
