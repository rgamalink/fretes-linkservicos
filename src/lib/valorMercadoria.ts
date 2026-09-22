import { supabase } from "@/integrations/supabase/client";

// Valor médio de mercadoria (R$/ton) por produto — valores de partida
// (baseline), calculados originalmente a partir da planilha Base.xlsm, aba
// "Base", coluna BG (PRODUTO) x coluna BR (Valor da Mercadoria R$/ton),
// filtrando apenas registros com DATA (coluna C) em 2025 ou 2026.
// n = quantidade de registros usados no cálculo da média.
//
// A partir do botão "Atualizar Valor da Carga" (tela de Configuração), um
// administrador pode recalcular esses valores a partir de um novo arquivo;
// o resultado é salvo na tabela valores_mercadoria e carregado por cima
// deste baseline em carregarValoresMercadoriaSalvos(), sem precisar de um
// novo deploy.
export const VALOR_MEDIO_POR_PRODUTO: Record<string, { avg: number; n: number }> = {
  "Areia": { avg: 38.51, n: 2256 },
  "Calcário": { avg: 117.11, n: 55 },
  "Carvão": { avg: 1258.45, n: 3 },
  "Cavaco de Madeira": { avg: 225.0, n: 1 },
  "Container": { avg: 1000.0, n: 3 },
  "Coque": { avg: 726.19, n: 2161 },
  "Escória": { avg: 27.5, n: 593 },
  "Espodumênio": { avg: 4650.77, n: 3815 },
  "Gesso": { avg: 335.95, n: 8 },
  "Gusa": { avg: 2435.69, n: 378 },
  "Manganês": { avg: 13381.51, n: 92 },
  "Milho": { avg: 1000.0, n: 1 },
  "Minério": { avg: 218.68, n: 7818 },
  "Outros": { avg: 66.74, n: 14 },
  "Soja": { avg: 2300.0, n: 1 },
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Valores efetivamente em uso: começam iguais ao baseline acima e são
// substituídos (produto a produto) assim que carregarValoresMercadoriaSalvos()
// traz o que já foi atualizado via upload, ou logo após um novo upload.
let valoresAtuais: Record<string, { avg: number; n: number }> = { ...VALOR_MEDIO_POR_PRODUTO };
let indiceNormalizado: Record<string, string> = Object.fromEntries(
  Object.keys(valoresAtuais).map((produto) => [normalizar(produto), produto]),
);

function reconstruirIndice() {
  indiceNormalizado = Object.fromEntries(
    Object.keys(valoresAtuais).map((produto) => [normalizar(produto), produto]),
  );
}

/** Produtos conhecidos no momento (baseline + atualizações já carregadas). */
export function produtosConhecidos(): string[] {
  return Object.keys(valoresAtuais);
}

/** Busca o valor médio (R$/ton) do produto informado, ignorando acentos e maiúsculas/minúsculas. */
export function buscarValorMedioProduto(produto: string): number | null {
  const chave = normalizar(produto);
  if (!chave) return null;
  const encontrado = indiceNormalizado[chave];
  if (!encontrado) return null;
  return valoresAtuais[encontrado]?.avg ?? null;
}

/** Aplica por cima do baseline os valores recalculados (upsert por produto). */
export function aplicarValoresAtualizados(novos: Record<string, { avg: number; n: number }>) {
  valoresAtuais = { ...valoresAtuais, ...novos };
  reconstruirIndice();
}

/** Busca na tabela valores_mercadoria o que já foi salvo por uploads anteriores. */
export async function carregarValoresMercadoriaSalvos(): Promise<void> {
  const { data, error } = await supabase.from("valores_mercadoria").select("produto, avg, n");
  if (error || !data) return;
  const novos: Record<string, { avg: number; n: number }> = {};
  for (const linha of data) {
    novos[linha.produto] = { avg: Number(linha.avg), n: linha.n };
  }
  aplicarValoresAtualizados(novos);
}
