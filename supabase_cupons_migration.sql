-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Sistema de cupons de desconto/parceria — cupom reutilizável (mesmo código
-- serve pra vários profissionais, não é um código único por pessoa) que dá 1
-- mês grátis do Multi Autônomo (R$29,90) pra profissional que ajuda a
-- divulgar a plataforma. A partir do 2º mês, cobra normal via a assinatura
-- recorrente da Asaas (ver /api/assinatura/cobrar no backend).
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project").
-- Se depois de rodar isso as colunas/policies não aparecerem mais, não rode
-- este script de novo por cima — abra ticket de suporte com a Supabase
-- primeiro, é sintoma de bug da plataforma, não erro neste script.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) CUPONS — catálogo de códigos. "tipo" já nasce como enum de 1 valor
--    (mes_gratis_autonomo) de propósito — deixa explícito no schema que
--    outros tipos de cupom (desconto %, outro plano) exigem decisão de
--    produto antes de existir, não é só "adicionar mais uma string solta".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists cupons (
  id            uuid primary key default gen_random_uuid(),
  -- Sempre maiúsculo (normalizado no backend antes de gravar/validar) pra
  -- "divulga30" e "DIVULGA30" serem o mesmo cupom aos olhos de quem usa.
  codigo        text not null unique,
  tipo          text not null default 'mes_gratis_autonomo'
                  check (tipo in ('mes_gratis_autonomo')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  -- null = sem data de validade / sem limite de usos (cupom "vitalício").
  expira_em     timestamptz,
  usos_maximos  int,
  -- Contador denormalizado (evita um count(*) em cupons_usados a cada
  -- validação) — incrementado atomicamente pelo backend junto do insert em
  -- cupons_usados (mesma transação lógica, ver /api/assinatura/cobrar).
  usos_count    int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2) CUPONS_USADOS — quem usou qual cupom. O unique(cupom_id, titular_email)
--    É a trava de verdade contra o mesmo profissional usar o mesmo cupom
--    duas vezes — não depende só do backend lembrar de checar antes de
--    inserir (proteção mesmo sob corrida/retry).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists cupons_usados (
  id             uuid primary key default gen_random_uuid(),
  cupom_id       uuid not null references cupons(id),
  titular_email  text not null,
  usado_em       timestamptz not null default now(),
  unique (cupom_id, titular_email)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3) ASSINATURAS — de qual cupom (se algum) veio o ciclo atual, e se esse
--    ciclo específico foi cortesia (sem cobrança na Asaas). "cortesia"
--    volta pra false sozinho quando o webhook confirma a cobrança do mês 2
--    (ver /api/webhook-asaas) — não existe update manual disso.
-- ─────────────────────────────────────────────────────────────────────────
alter table assinaturas
  add column if not exists cupom_codigo text,
  add column if not exists cortesia     boolean not null default false;

-- RLS: mesmo padrão de "assinaturas" (supabase_pendencias_doc_pagamento_migration.sql)
-- — só o backend (service_role) grava; leitura de "cupons" é pública porque o
-- código do cupom não é secreto por natureza (é feito pra ser divulgado) e o
-- front usa isso só pra feedback visual instantâneo, nunca pra decidir sozinho
-- se ativa o plano — quem decide de verdade é sempre o backend, revalidando
-- tudo de novo em /api/assinatura/cobrar antes de gravar qualquer coisa.
-- "cupons_usados" não tem NENHUMA policy de leitura pública — só admin
-- (service_role) vê quem usou o quê.
alter table cupons enable row level security;
alter table cupons_usados enable row level security;

drop policy if exists "Leitura publica de cupons" on cupons;
create policy "Leitura publica de cupons"
  on cupons
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Somente backend cria cupom" on cupons;
create policy "Somente backend cria cupom"
  on cupons
  for insert
  to service_role
  with check (true);

drop policy if exists "Somente backend edita cupom" on cupons;
create policy "Somente backend edita cupom"
  on cupons
  for update
  to service_role
  using (true)
  with check (true);

drop policy if exists "Somente backend grava uso de cupom" on cupons_usados;
create policy "Somente backend grava uso de cupom"
  on cupons_usados
  for insert
  to service_role
  with check (true);

drop policy if exists "Somente backend le uso de cupom" on cupons_usados;
create policy "Somente backend le uso de cupom"
  on cupons_usados
  for select
  to service_role
  using (true);

-- Exemplo de cupom pra testar (comente/apague se não quiser criar já) —
-- "DIVULGA30" reutilizável, sem expiração, sem limite de usos.
-- insert into cupons (codigo, tipo) values ('DIVULGA30', 'mes_gratis_autonomo')
--   on conflict (codigo) do nothing;
