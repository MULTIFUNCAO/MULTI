-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fundação do novo modelo de negócio: Multi para de intermediar pagamento de
-- serviço e passa a monetizar via assinatura mensal do profissional/empresa.
-- Esta tabela é o registro único do plano ativo de cada titular (usuário
-- profissional ou empresa parceira) — clientes nunca ganham linha aqui (são
-- sempre grátis). Ainda não há cobrança real integrada (fica pra quando o
-- Asaas entrar); todo plano novo nasce com status:'trial'.

create table if not exists assinaturas (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  -- "usuario" = profissional autônomo (tabela usuarios), "empresa" = empresa
  -- parceira (tabela empresas). Cada titular tem no máximo uma linha (ver
  -- unique abaixo) — trocar de plano é upsert por cima, não histórico.
  titular_tipo          text not null check (titular_tipo in ('usuario','empresa')),
  -- email do titular (usuarios.email ou empresas.email) — texto puro, mesmo
  -- padrão de identidade usado no resto do app (sem Supabase Auth real).
  titular_email         text not null,
  plano                 text not null,
  status                text not null default 'trial' check (status in ('trial','ativa','inadimplente','cancelada','expirada')),
  inicio                timestamptz not null default now(),
  expira_em             timestamptz,
  -- Reservado pra integração futura com Asaas (webhook de cobrança) — não é
  -- lido nem escrito por nenhum código ainda.
  asaas_subscription_id text,
  unique (titular_tipo, titular_email),
  check (
    (titular_tipo = 'usuario' and plano in ('autonomo','pro')) or
    (titular_tipo = 'empresa' and plano in ('empresa','empresa_plus'))
  )
);

-- RLS: mesmo padrão permissivo já documentado em supabase_pedidos_migration.sql
-- e nas migrations anteriores — o app não usa sessão real do Supabase Auth no
-- frontend (só a chave anon), então não dá pra restringir via auth.uid().
alter table assinaturas enable row level security;

drop policy if exists "Leitura publica de assinaturas" on assinaturas;
create policy "Leitura publica de assinaturas"
  on assinaturas
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de assinaturas" on assinaturas;
create policy "Cadastro publico de assinaturas"
  on assinaturas
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Edicao publica de assinaturas" on assinaturas;
create policy "Edicao publica de assinaturas"
  on assinaturas
  for update
  to anon, authenticated
  using (true)
  with check (true);
