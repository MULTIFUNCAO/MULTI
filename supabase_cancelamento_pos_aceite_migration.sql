-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Cancelamento após aceite do profissional: antes, só dava pra cancelar um
-- pedido "aberto" (antes de aceitar proposta) — uma vez em_andamento/
-- executando, o pedido ficava travado pra sempre se algo impedisse o
-- serviço de acontecer. Essas colunas guardam quem cancelou e por quê,
-- mesmo padrão de contestado_em/contestacao_motivo (conceito separado —
-- disputa não é cancelamento). Este script é idempotente.

alter table pedidos add column if not exists cancelado_motivo text;
alter table pedidos add column if not exists cancelado_por text;
