# Liberar leitura das cotações submetidas

## Alteração
- Criar uma nova migração SQL para remover exclusivamente as duas políticas atuais de leitura de `public.cotacoes_aprovacao`.
- Criar uma única política de `SELECT` que permita a todos os usuários autenticados visualizar todas as linhas.
- Aplicar a migração no banco e confirmar as políticas resultantes.

## Preservação
- Não alterar políticas de `INSERT`, `UPDATE` ou `DELETE`.
- Não alterar o código ou a interface do sistema.
