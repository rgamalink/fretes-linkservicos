import { supabase } from "@/integrations/supabase/client";
import {
  EIXOS_LIST,
  cardVazio,
  geraisVazio,
  type Cotacao,
  type DadosCard,
  type DadosGerais,
} from "@/lib/pricing";

type CotacaoSalvaRow = {
  id: string;
  salvo_em: string;
  gerais: DadosGerais;
  cards: Record<number, DadosCard>;
};

function linhaParaCotacao(row: CotacaoSalvaRow): Cotacao {
  return {
    id: row.id,
    salvoEm: row.salvo_em,
    gerais: { ...geraisVazio(), ...row.gerais },
    cards: Object.fromEntries(
      EIXOS_LIST.map((e) => [e, { ...cardVazio(), ...(row.cards?.[e] ?? {}) }]),
    ),
  };
}

/** Cotações salvas por qualquer usuário, visíveis a todos os perfis. */
export async function listarCotacoesSalvas(): Promise<Cotacao[]> {
  const { data, error } = await supabase
    .from("cotacoes_salvas")
    .select("id, salvo_em, gerais, cards")
    .order("salvo_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => linhaParaCotacao(row as CotacaoSalvaRow));
}

/**
 * Cria uma cotação salva. Passe `id` para gravar com uma referência já
 * conhecida (ex.: mesmo id usado como ref_local de uma submissão existente);
 * omita para deixar o banco gerar um novo id.
 */
export async function criarCotacaoSalva(
  gerais: DadosGerais,
  cards: Record<number, DadosCard>,
  id?: string,
): Promise<Cotacao> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) throw new Error("Sessão expirada. Entre novamente.");

  const { data, error } = await supabase
    .from("cotacoes_salvas")
    .insert({
      ...(id ? { id } : {}),
      user_id: user.id,
      created_by_email: user.email ?? null,
      cliente: gerais.cliente ?? "",
      origem: gerais.origem ?? "",
      destino: gerais.destino ?? "",
      gerais: gerais as never,
      cards: cards as never,
    })
    .select("id, salvo_em, gerais, cards")
    .single();
  if (error) throw error;
  return linhaParaCotacao(data as CotacaoSalvaRow);
}

/**
 * Sobrescreve uma cotação já salva (mesmo id). Devolve `true` se de fato
 * encontrou e atualizou uma linha, `false` se nenhuma linha com esse id
 * existe em cotacoes_salvas (ex.: id vindo de uma submissão que nunca
 * chegou a ser salva) — quem chamar deve então criar a linha em vez de
 * assumir silenciosamente que a atualização "deu certo".
 */
export async function atualizarCotacaoSalva(
  id: string,
  gerais: DadosGerais,
  cards: Record<number, DadosCard>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("cotacoes_salvas")
    .update({
      cliente: gerais.cliente ?? "",
      origem: gerais.origem ?? "",
      destino: gerais.destino ?? "",
      gerais: gerais as never,
      cards: cards as never,
      salvo_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Salva a cotação de forma autoritativa no servidor, sem depender de uma
 * lista já carregada no navegador para decidir entre criar ou atualizar:
 * tenta atualizar por id e, se nenhuma linha existir com esse id (ou não
 * houver id ainda), cria uma nova — reaproveitando o mesmo id quando ele
 * já existir (ex.: ref_local de uma submissão), para manter o vínculo com
 * o fluxo de aprovação.
 */
export async function salvarOuAtualizarCotacaoSalva(
  id: string | null,
  gerais: DadosGerais,
  cards: Record<number, DadosCard>,
): Promise<{ cotacao: Cotacao; criada: boolean }> {
  if (id) {
    const atualizou = await atualizarCotacaoSalva(id, gerais, cards);
    if (atualizou) {
      return { cotacao: { id, salvoEm: new Date().toISOString(), gerais, cards }, criada: false };
    }
  }
  const cotacao = await criarCotacaoSalva(gerais, cards, id ?? undefined);
  return { cotacao, criada: true };
}

export async function apagarCotacaoSalva(id: string): Promise<void> {
  const { error } = await supabase.from("cotacoes_salvas").delete().eq("id", id);
  if (error) throw error;
}
