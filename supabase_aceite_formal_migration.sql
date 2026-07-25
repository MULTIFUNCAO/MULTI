-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da Fase 2 (aceite formal da contratação): antes
-- de ambos os lados confirmarem no chat, dados como telefone real ficam ocultos
-- (ex: MinhasDemandasScreen). Este script é idempotente.

-- 1. Duas colunas em "pedidos" — relação 1-pra-1 com a linha (cliente_id e
-- profissional_aceito já identificam as duas partes, cada uma aceita no máximo
-- uma vez), mesmo padrão já usado por concluido_em/contestado_em. "Liberado" =
-- as duas colunas preenchidas, calculado no app.
alter table pedidos add column if not exists aceite_formal_cliente_em timestamptz;
alter table pedidos add column if not exists aceite_formal_profissional_em timestamptz;
