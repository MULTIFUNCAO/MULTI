-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema real da tabela "propostas", que hoje só existe
-- "de fato" no painel do Supabase (nunca teve migration própria no repo).
-- Este script é idempotente (if not exists em tudo).

-- 1. Tabela "propostas" — um profissional/empresa demonstra interesse em um
-- "pedido" ("Tenho Interesse", ProfessionalHome). O cliente aceita uma delas
-- em PropostasScreen, o que atualiza pedidos.status para "em_andamento".
create table if not exists propostas (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  pedido_id           uuid references pedidos(id),
  profissional_id     text,   -- email (ou whatsapp, se sem email) de quem se candidatou
  profissional_nome   text,
  profissional_email  text,
  valor               numeric,
  mensagem            text,
  status              text not null default 'pendente',
  cliente_email       text    -- email do cliente dono do pedido (denormalizado, ver Fase 1)
);

-- 2. Um profissional só pode ter UMA proposta por pedido. Antes desta constraint,
-- clicar "Tenho Interesse" mais de uma vez no mesmo pedido criava uma linha nova
-- a cada clique em vez de atualizar a existente (o upsert do frontend não tinha
-- como deduplicar sem essa unique). Necessário rodar ANTES do frontend passar a
-- enviar onConflict:"pedido_id,profissional_id" no upsert.
alter table propostas drop constraint if exists propostas_pedido_profissional_key;
alter table propostas add constraint propostas_pedido_profissional_key
  unique (pedido_id, profissional_id);

-- 3. RLS: mesmo padrão permissivo documentado em supabase_pedidos_migration.sql
-- (sem sessão real do Supabase Auth no frontend, então não dá pra restringir
-- por auth.uid()).
alter table propostas enable row level security;

drop policy if exists "Leitura publica de propostas" on propostas;
create policy "Leitura publica de propostas"
  on propostas
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de propostas" on propostas;
create policy "Cadastro publico de propostas"
  on propostas
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Edicao publica de propostas" on propostas;
create policy "Edicao publica de propostas"
  on propostas
  for update
  to anon, authenticated
  using (true)
  with check (true);
