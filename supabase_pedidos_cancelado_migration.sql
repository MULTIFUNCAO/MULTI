-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Adiciona "cancelado" ao enum de status de pedidos. Existia um botão de
-- cancelar real na UI (RadarSearchScreen) que chamava um valor ('cancelled',
-- em inglês) que nunca bateu com o CHECK constraint — o update sempre falhava
-- silenciosamente e o usuário via um toast de sucesso enganoso. Corrigido
-- junto com o schema (Reputação de longo prazo: taxa de conclusão/
-- cancelamento). Este script é idempotente.

alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('aberto','em_andamento','executando','concluido','em_disputa','cancelado'));
