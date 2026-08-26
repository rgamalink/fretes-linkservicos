// Valor médio de mercadoria (R$/ton) por produto, calculado a partir da planilha
// Base.xlsm, aba "Base", coluna BG (PRODUTO) x coluna BR (Valor da Mercadoria R$/ton),
// filtrando apenas registros com DATA (coluna C) em 2025 ou 2026.
// n = quantidade de registros usados no cálculo da média.
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

export const PRODUTOS_CONHECIDOS = Object.keys(VALOR_MEDIO_POR_PRODUTO);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const INDICE_NORMALIZADO: Record<string, string> = Object.fromEntries(
  PRODUTOS_CONHECIDOS.map((produto) => [normalizar(produto), produto]),
);

/** Busca o valor médio (R$/ton) do produto informado, ignorando acentos e maiúsculas/minúsculas. */
export function buscarValorMedioProduto(produto: string): number | null {
  const chave = normalizar(produto);
  if (!chave) return null;
  const encontrado = INDICE_NORMALIZADO[chave];
  if (!encontrado) return null;
  return VALOR_MEDIO_POR_PRODUTO[encontrado]?.avg ?? null;
}
