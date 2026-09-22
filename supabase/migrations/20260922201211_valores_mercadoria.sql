-- Valor médio de mercadoria (R$/ton) por produto, recalculado a partir do
-- upload de uma planilha na tela de Configuração ("Atualizar Valor da
-- Carga"). Substitui, para o produto atualizado, o valor estático que hoje
-- vem embutido no código (src/lib/valorMercadoria.ts), sem exigir um novo
-- deploy — todo usuário autenticado lê esta tabela ao abrir o sistema.
CREATE TABLE public.valores_mercadoria (
  produto text PRIMARY KEY,
  avg numeric NOT NULL,
  n integer NOT NULL,
  janela_meses integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.valores_mercadoria DROP CONSTRAINT IF EXISTS valores_mercadoria_janela_meses_check;
ALTER TABLE public.valores_mercadoria ADD CONSTRAINT valores_mercadoria_janela_meses_check
  CHECK (janela_meses IN (12, 18, 24));

GRANT SELECT ON public.valores_mercadoria TO authenticated;
GRANT ALL ON public.valores_mercadoria TO service_role;

ALTER TABLE public.valores_mercadoria ENABLE ROW LEVEL SECURITY;

-- Leitura liberada para qualquer usuário logado (o valor auto-preenchido no
-- campo "Produto" da cotação depende disso). A escrita só acontece via
-- server function com o service role (ver atualizarValorMercadoria em
-- src/lib/valor-mercadoria.functions.ts), que já valida perfil de
-- administrador antes de gravar — por isso nenhuma policy de INSERT/UPDATE
-- é concedida a "authenticated".
DROP POLICY IF EXISTS "Signed-in users can view valores de mercadoria" ON public.valores_mercadoria;
CREATE POLICY "Signed-in users can view valores de mercadoria"
ON public.valores_mercadoria FOR SELECT TO authenticated
USING (true);
