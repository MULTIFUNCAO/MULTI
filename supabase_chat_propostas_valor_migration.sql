-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fluxo "propor valor" no chat de negociação: só o profissional pode propor
-- um novo valor (diferente do orçamento inicial do pedido); o cliente aceita
-- ou recusa. Aceitar atualiza pedidos.valor direto. Pode ter várias rodadas
-- (se recusado, o profissional propõe de novo — vira uma linha nova).
--
-- Tabela separada de "mensagens" de propósito: "mensagens" tem no comentário
-- da própria migration original que é imutável (só select + insert, nunca
-- update/delete), e é a tabela que já sofreu com o bug de DDL não-durável
-- desse projeto (ver supabase_multifuncao_project.md) — não faz sentido
-- empilhar mais risco/mais uma policy de UPDATE nela. Também é diferente de
-- "propostas" (candidatura a um pedido, antes de virar "em_andamento") —
-- conceito distinto, mistura confundiria os dois fluxos.
create table if not exists chat_propostas_valor (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null references pedidos(id),
  profissional_email  text not null,
  valor               numeric not null,
  status              text not null default 'pendente',
  criado_em           timestamptz not null default now(),
  respondido_em       timestamptz
);

alter table chat_propostas_valor drop constraint if exists chat_propostas_valor_status_check;
alter table chat_propostas_valor add constraint chat_propostas_valor_status_check
  check (status in ('pendente', 'aceita', 'recusada'));

-- Mesmo padrão de índice de "mensagens" (idx_mensagens_pedido_criado): consulta
-- real é sempre filtrada por pedido_id e ordenada por criado_em pro polling
-- do chat intercalar com as mensagens na ordem certa.
create index if not exists idx_chat_propostas_valor_pedido
  on chat_propostas_valor (pedido_id, criado_em);

-- RLS: mesmo padrão permissivo já documentado em pedidos/mensagens — app não
-- usa sessão real do Supabase Auth no frontend, então "profissional_email"
-- guarda email em texto puro, e as policies ficam permissivas em vez de
-- restringir por dono da linha. Policies vêm junto com o enable desta vez
-- (não deixar "RLS habilitado sem policy" — isso se mostrou instável em
-- pedidos/users/etc., ver supabase_multifuncao_project.md).
alter table chat_propostas_valor enable row level security;

drop policy if exists "Leitura publica de chat_propostas_valor" on chat_propostas_valor;
create policy "Leitura publica de chat_propostas_valor"
  on chat_propostas_valor
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de chat_propostas_valor" on chat_propostas_valor;
create policy "Cadastro publico de chat_propostas_valor"
  on chat_propostas_valor
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Edicao publica de chat_propostas_valor" on chat_propostas_valor;
create policy "Edicao publica de chat_propostas_valor"
  on chat_propostas_valor
  for update
  to anon, authenticated
  using (true)
  with check (true);
