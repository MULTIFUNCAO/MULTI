-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da tabela "aceites_termo" (Fase 3 do fluxo de
-- contratação: gate jurídico antes da liberação de contato no chat — além da
-- confirmação mútua de data já coberta por pedidos.aceite_formal_*, agora
-- cada lado também precisa aceitar o Termo de Isenção de Responsabilidade
-- antes do WhatsApp aparecer em NegociacaoChatScreen). Este script é
-- idempotente (if not exists em tudo).

-- 1. Tabela "aceites_termo" — uma linha por (pedido_id, usuario_id): cada lado
-- aceita no máximo uma vez por pedido. Tabela separada em vez de duas colunas
-- em "pedidos" (como aceite_formal_*) porque aqui também guardamos a versão
-- do termo aceito — o texto ainda está em revisão jurídica, e quando mudar
-- (versao_termo muda junto) dá pra saber quem aceitou qual versão.
create table if not exists aceites_termo (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null references pedidos(id),
  usuario_id   text not null,
  aceito_em    timestamptz not null default now(),
  versao_termo text not null,
  unique (pedido_id, usuario_id)
);

create index if not exists idx_aceites_termo_pedido on aceites_termo (pedido_id);

-- 2. RLS: mesmo padrão permissivo documentado em supabase_mensagens_migration.sql
-- (sem sessão real do Supabase Auth no frontend, então não dá pra restringir por
-- auth.uid()). Só select + insert (upsert do frontend usa insert on conflict) —
-- aceite não é editado nem apagado depois de registrado.
alter table aceites_termo enable row level security;

drop policy if exists "Leitura publica de aceites_termo" on aceites_termo;
create policy "Leitura publica de aceites_termo"
  on aceites_termo
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de aceites_termo" on aceites_termo;
create policy "Cadastro publico de aceites_termo"
  on aceites_termo
  for insert
  to anon, authenticated
  with check (true);
