-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema real da tabela "pedidos", que hoje só existe
-- "de fato" no painel do Supabase (nunca teve migration própria no repo).
-- Este script é idempotente (if not exists em tudo) — pode ser rodado com
-- segurança mesmo com a tabela e os dados já existindo em produção.

-- 1. Tabela "pedidos" — publicada pelo cliente em PostServiceScreen, aceita
-- por um profissional/empresa via "propostas" (ver supabase_propostas_migration.sql).
create table if not exists pedidos (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  cliente_id            text,               -- email do cliente (texto puro, ver item 3)
  cliente_nome          text,
  categoria             text,
  descricao             text,
  valor                 numeric,
  cep                   text,
  cidade                text,
  fotos                 jsonb,              -- array de URLs (Supabase Storage, bucket pedidos-fotos)
  status                text not null default 'aberto',
  profissional_aceito   text,               -- email do profissional/empresa que aceitou
  profissional_nome     text,
  concluido_em          timestamptz,
  contestado_em         timestamptz,
  contestacao_motivo    text
);

-- 2. Vocabulário único de status (Fase 1 de consolidação: front-end para de usar
-- um segundo vocabulário em inglês em paralelo a este). Trava no banco os únicos
-- 5 valores válidos do ciclo de vida do pedido.
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('aberto','em_andamento','executando','concluido','em_disputa'));

-- 3. RLS: mesmo padrão já documentado em supabase_empresas_migration.sql/
-- supabase_profissionais_migration.sql — o app não usa sessão real do Supabase
-- Auth no frontend (só a chave anon), então "cliente_id"/"profissional_aceito"
-- guardam email em texto puro, não auth.uid(), e as policies ficam permissivas
-- (using(true)/with check(true)) em vez de restringir por dono da linha.
alter table pedidos enable row level security;

drop policy if exists "Leitura publica de pedidos" on pedidos;
create policy "Leitura publica de pedidos"
  on pedidos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de pedidos" on pedidos;
create policy "Cadastro publico de pedidos"
  on pedidos
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Edicao publica de pedidos" on pedidos;
create policy "Edicao publica de pedidos"
  on pedidos
  for update
  to anon, authenticated
  using (true)
  with check (true);
