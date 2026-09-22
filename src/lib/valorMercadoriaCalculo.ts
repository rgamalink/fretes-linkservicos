// Cálculo puro (sem I/O) da média de valor de mercadoria por produto, usado
// pelo botão "Atualizar Valor da Carga" na tela de Configuração.
//
// Regra: para cada produto, considera a média do valor da mercadoria dos
// últimos 12 meses corridos (a partir da data de referência); se não houver
// nenhum registro válido nesse período, busca nos últimos 18 meses; se ainda
// assim não houver, busca nos últimos 24 meses. Registros com valor zerado
// ou vazio são sempre desconsiderados da média (em qualquer janela).
export interface RegistroMercadoria {
  data: Date;
  produto: string;
  valor: number | null | undefined;
}

export type JanelaMeses = 12 | 18 | 24;

export interface ValorMedioCalculado {
  avg: number;
  n: number;
  janelaMeses: JanelaMeses;
}

const JANELAS: JanelaMeses[] = [12, 18, 24];

function subtrairMeses(data: Date, meses: number): Date {
  const copia = new Date(data);
  copia.setMonth(copia.getMonth() - meses);
  return copia;
}

function valorValido(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor !== 0;
}

/**
 * Agrupa os registros por produto e calcula, para cada um, a média (R$/ton)
 * na primeira janela (12 → 18 → 24 meses) que tiver ao menos um registro com
 * valor válido. Produtos sem nenhum registro válido em nenhuma das três
 * janelas não aparecem no resultado.
 */
export function calcularValoresMedios(
  registros: RegistroMercadoria[],
  referencia: Date = new Date(),
): Map<string, ValorMedioCalculado> {
  const porProduto = new Map<string, RegistroMercadoria[]>();
  for (const registro of registros) {
    const produto = registro.produto.trim();
    if (!produto) continue;
    if (!(registro.data instanceof Date) || Number.isNaN(registro.data.getTime())) continue;
    const lista = porProduto.get(produto);
    if (lista) lista.push(registro);
    else porProduto.set(produto, [registro]);
  }

  const resultado = new Map<string, ValorMedioCalculado>();
  for (const [produto, linhas] of porProduto) {
    for (const janelaMeses of JANELAS) {
      const cutoff = subtrairMeses(referencia, janelaMeses);
      const valores = linhas
        .filter((l) => l.data >= cutoff && l.data <= referencia)
        .map((l) => l.valor)
        .filter(valorValido);
      if (valores.length === 0) continue;
      const soma = valores.reduce((a, b) => a + b, 0);
      resultado.set(produto, { avg: soma / valores.length, n: valores.length, janelaMeses });
      break;
    }
  }
  return resultado;
}
