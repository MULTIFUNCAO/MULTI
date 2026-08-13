-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
-- Projeto "multifuncao", ref nlpfjkxqypveontunrxj.
--
-- Registro de despesas do negócio (tráfego pago, ferramentas, outros custos)
-- pro Admin Panel calcular Lucro Líquido = Receita - Despesas, não só
-- receita bruta (que já existia em /api/admin/financial).
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project",
-- confirmado de novo em 2026-08-13 na tabela "assinaturas" — um pagamento
-- real do RENATO sumiu do banco depois de gravado com sucesso). Depois de
-- rodar, confirme com os SELECTs no final. Se algo sumir sozinho depois, NÃO
-- rode este script de novo por cima — abra ticket de suporte com a Supabase
-- primeiro, é sintoma de bug da plataforma, não de erro aqui.

create table if not exists despesas (
  id          uuid primary key default gen_random_uuid(),
  data        date not null default current_date,
  -- Texto livre em vez de enum de propósito — categorias de despesa mudam
  -- mais rápido do que valeria a pena travar num CHECK (trafego_pago,
  -- ferramentas, etc. são só sugestões da UI, não uma lista fechada).
  categoria   text not null,
  descricao   text,
  valor       numeric(10,2) not null check (valor > 0),
  criado_em   timestamptz not null default now()
);

-- RLS: só o backend (service_role) mexe nisso — é dado financeiro interno,
-- sem motivo nenhum pra existir policy de leitura pública (diferente de
-- "cupons", que é feito pra ser visto). Mesmo padrão de "cupons_usados"
-- (supabase_cupons_migration.sql).
alter table despesas enable row level security;

drop policy if exists "Somente backend le despesas" on despesas;
create policy "Somente backend le despesas"
  on despesas
  for select
  to service_role
  using (true);

drop policy if exists "Somente backend grava despesas" on despesas;
create policy "Somente backend grava despesas"
  on despesas
  for insert
  to service_role
  with check (true);

drop policy if exists "Somente backend edita despesas" on despesas;
create policy "Somente backend edita despesas"
  on despesas
  for update
  to service_role
  using (true)
  with check (true);

drop policy if exists "Somente backend apaga despesas" on despesas;
create policy "Somente backend apaga despesas"
  on despesas
  for delete
  to service_role
  using (true);

-- Confirmação — rode depois e confira o resultado.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'despesas'
order by ordinal_position;

select policyname, cmd, roles from pg_policies where tablename = 'despesas';
