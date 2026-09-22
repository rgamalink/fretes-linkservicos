// Lê o arquivo Excel enviado pelo botão "Atualizar Valor da Carga" (mesma
// estrutura da planilha Base.xlsm/Base original: aba "Base", coluna C =
// DATA, coluna BG = PRODUTO, coluna BR = Valor da Mercadoria R$/ton) e
// devolve a média recalculada por produto.
import * as XLSX from "xlsx";
import {
  calcularValoresMedios,
  type RegistroMercadoria,
  type ValorMedioCalculado,
} from "@/lib/valorMercadoriaCalculo";

const COL_DATA = "C";
const COL_PRODUTO = "BG";
const COL_VALOR = "BR";

/** Converte uma letra de coluna (ex.: "BG") para o índice 0-based da coluna. */
function colIndex(letra: string): number {
  let n = 0;
  for (const ch of letra.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function paraNumero(valor: unknown): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
    const num = Number(normalizado);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

/** Lê o arquivo e monta a lista de registros (data, produto, valor) das linhas válidas. */
async function lerRegistros(file: File): Promise<RegistroMercadoria[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const nomeAba =
    workbook.SheetNames.find((nome) => nome.trim().toLowerCase() === "base") ??
    workbook.SheetNames[0];
  const sheet = nomeAba ? workbook.Sheets[nomeAba] : undefined;
  if (!sheet) {
    throw new Error("O arquivo não contém nenhuma planilha legível.");
  }

  // Lê célula a célula por endereço absoluto (ex.: "C5"), em vez de
  // sheet_to_json({header:1}): esse modo indexa o array retornado a partir
  // da primeira coluna realmente usada na planilha (sheet['!ref']), que nem
  // sempre é a coluna A — o que deslocaria os índices fixos de C/BG/BR.
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const idxData = colIndex(COL_DATA);
  const idxProduto = colIndex(COL_PRODUTO);
  const idxValor = colIndex(COL_VALOR);

  const registros: RegistroMercadoria[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const celData = sheet[XLSX.utils.encode_cell({ r, c: idxData })]?.v;
    const celProduto = sheet[XLSX.utils.encode_cell({ r, c: idxProduto })]?.v;
    const celValor = sheet[XLSX.utils.encode_cell({ r, c: idxValor })]?.v;
    if (!(celData instanceof Date) || Number.isNaN(celData.getTime())) continue;
    if (typeof celProduto !== "string" || !celProduto.trim()) continue;
    registros.push({
      data: celData,
      produto: celProduto.trim(),
      valor: paraNumero(celValor),
    });
  }
  return registros;
}

export interface ResultadoImportacao {
  valores: Map<string, ValorMedioCalculado>;
  totalRegistros: number;
  totalProdutos: number;
}

/** Lê o arquivo enviado e calcula a média de valor de mercadoria por produto. */
export async function calcularValoresDeArquivo(file: File): Promise<ResultadoImportacao> {
  const registros = await lerRegistros(file);
  if (registros.length === 0) {
    throw new Error(
      `Nenhum registro válido encontrado no arquivo (esperado: coluna ${COL_DATA} = DATA, coluna ${COL_PRODUTO} = PRODUTO, coluna ${COL_VALOR} = Valor da Mercadoria R$/ton).`,
    );
  }
  const valores = calcularValoresMedios(registros);
  if (valores.size === 0) {
    throw new Error(
      "Nenhum produto teve valor de mercadoria válido (não zerado/vazio) nos últimos 24 meses.",
    );
  }
  return { valores, totalRegistros: registros.length, totalProdutos: valores.size };
}
