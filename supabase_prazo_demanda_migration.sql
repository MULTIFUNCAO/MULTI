-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Adiciona prazo/urgência à demanda de mão de obra (NovaDemandaScreen).
-- Campo opcional (nullable) — pedidos antigos e pedidos normais de cliente
-- continuam sem valor aqui, sem quebrar nada.

alter table pedidos
  add column if not exists prazo text;

alter table pedidos drop constraint if exists pedidos_prazo_check;
alter table pedidos add constraint pedidos_prazo_check
  check (prazo is null or prazo in ('urgente', 'essa_semana', 'sem_pressa'));
