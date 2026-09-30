-- Índices ANTT (peso por eixo, deslocamento R$/km e carga/descarga R$ por
-- tipo de carga x eixo) editáveis pela tela de Configuração ("Atualizar
-- Índices ANTT"), sem precisar de um novo deploy. Guardados como um único
-- documento jsonb (id fixo 'default') porque é sempre lido/gravado por
-- inteiro — as mesmas 3 tabelas (Granel Sólido, Carga Geral, Container) são
-- sempre editadas juntas.
CREATE TABLE public.antt_coeficientes (
  id text PRIMARY KEY DEFAULT 'default',
  dados jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.antt_coeficientes TO authenticated;
GRANT ALL ON public.antt_coeficientes TO service_role;

ALTER TABLE public.antt_coeficientes ENABLE ROW LEVEL SECURITY;

-- Leitura liberada para qualquer usuário logado (o cálculo de frete de todo
-- mundo depende disso). A escrita só acontece via server function com o
-- service role (ver atualizarAnttCoeficientes em
-- src/lib/antt-coeficientes.functions.ts), que já valida perfil de
-- administrador antes de gravar — por isso nenhuma policy de INSERT/UPDATE
-- é concedida a "authenticated".
DROP POLICY IF EXISTS "Signed-in users can view antt coeficientes" ON public.antt_coeficientes;
CREATE POLICY "Signed-in users can view antt coeficientes"
ON public.antt_coeficientes FOR SELECT TO authenticated
USING (true);
