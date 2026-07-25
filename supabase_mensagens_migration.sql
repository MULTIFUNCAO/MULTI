-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da tabela "mensagens" (Fase 1 do fluxo de
-- contratação: chat de negociação entre quem pediu — cliente ou empresa — e o
-- profissional/empresa que se candidatou, antes da liberação de contato).
-- Este script é idempotente (if not exists em tudo).

-- 1. Tabela "mensagens" — uma linha por mensagem trocada num pedido/demanda já
-- em_andamento. pedido_id já desambigua a negociação: quando um pedido vira
-- em_andamento existe exatamente uma proposta aceita (pedidos.profissional_aceito),
-- então não é preciso referenciar propostas aqui.
create table if not exists mensagens (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id),
  remetente_email text not null,
  texto           text not null,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_mensagens_pedido_criado on mensagens (pedido_id, criado_em);

-- 2. RLS: mesmo padrão permissivo documentado em supabase_pedidos_migration.sql /
-- supabase_propostas_migration.sql (sem sessão real do Supabase Auth no frontend,
-- então não dá pra restringir por auth.uid()). Só select + insert nesta fase —
-- mensagens não são editadas nem apagadas.
alter table mensagens enable row level security;

drop policy if exists "Leitura publica de mensagens" on mensagens;
create policy "Leitura publica de mensagens"
  on mensagens
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de mensagens" on mensagens;
create policy "Cadastro publico de mensagens"
  on mensagens
  for insert
  to anon, authenticated
  with check (true);
