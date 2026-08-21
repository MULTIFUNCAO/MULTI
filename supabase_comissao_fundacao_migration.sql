-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 1 da fundação do modelo de comissão (ver .claude/plans, plano
-- "Modelo de Comissão 15% + Pagamento Intermediado"): só schema, ZERO
-- mudança de comportamento visível. Ninguém lê essas colunas ainda — isso
-- vem nas fases seguintes. Idempotente (if not exists em tudo).
--
-- IMPORTANTE (bug conhecido deste projeto Supabase): DDL/UPDATE já
-- reverteram sozinhos depois de "confirmados". Rode o teste de sanidade no
-- fim, espere alguns minutos, e rode de novo (reler com a chave anon) antes
-- de considerar concluído.

-- ─── 1. usuarios — modelo de cobrança + chave Pix pra repasse ─────────────
-- 'mensalidade' é o default: todo profissional já existente continua
-- exatamente como está hoje. Só cadastro novo (Fase 3) vai gravar 'comissao'
-- explicitamente.
alter table usuarios add column if not exists modelo_cobranca text
  not null default 'mensalidade';

do $$ begin
  alter table usuarios add constraint usuarios_modelo_cobranca_check
    check (modelo_cobranca in ('mensalidade','comissao'));
exception when duplicate_object then null; end $$;

alter table usuarios add column if not exists pix_key text;
alter table usuarios add column if not exists pix_key_tipo text;

do $$ begin
  alter table usuarios add constraint usuarios_pix_key_tipo_check
    check (pix_key_tipo is null or pix_key_tipo in ('cpf','cnpj','email','telefone','aleatoria'));
exception when duplicate_object then null; end $$;

-- Trava modelo_cobranca contra escrita direta via chave anon — mesmo padrão
-- já usado (e comprovado) pra usuarios.saldo_moedas
-- (supabase_moedas_carteira_migration.sql) e pedidos.approved
-- (trg_lock_approved). Sem isso, um profissional no modelo mensalidade
-- poderia se autodeclarar 'comissao' pra pular os limites de valor/
-- quantidade de serviço do próprio plano (ver Fase 3 do plano: o gate de
-- confirmar-servico pula essas checagens pra quem é 'comissao'). Só
-- service_role (o backend) pode mudar esse campo.
create or replace function usuarios_lock_modelo_cobranca()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.modelo_cobranca is distinct from old.modelo_cobranca then
      new.modelo_cobranca := old.modelo_cobranca;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_modelo_cobranca on usuarios;
create trigger trg_lock_modelo_cobranca
  before update on usuarios
  for each row execute function usuarios_lock_modelo_cobranca();

-- pix_key/pix_key_tipo ficam de fora do lock de propósito: é um campo de
-- autoatendimento no perfil (mesmo padrão de outros campos de perfil que já
-- são editáveis via RLS permissiva), não um contador/gate explorável.

-- ─── 2. pedidos — rastreamento de retenção/comissão/repasse ───────────────
alter table pedidos add column if not exists modelo_pagamento text;

do $$ begin
  alter table pedidos add constraint pedidos_modelo_pagamento_check
    check (modelo_pagamento is null or modelo_pagamento in ('direto','intermediado'));
exception when duplicate_object then null; end $$;

alter table pedidos add column if not exists valor_comissao numeric;
alter table pedidos add column if not exists valor_repasse numeric;
alter table pedidos add column if not exists asaas_payment_id_retencao text;
alter table pedidos add column if not exists retido_em timestamptz;
alter table pedidos add column if not exists repassado_em timestamptz;
alter table pedidos add column if not exists repasse_asaas_transfer_id text;
alter table pedidos add column if not exists repasse_liberado_por text;

do $$ begin
  alter table pedidos add constraint pedidos_repasse_liberado_por_check
    check (repasse_liberado_por is null or repasse_liberado_por in ('cliente','auto_24h','admin'));
exception when duplicate_object then null; end $$;

alter table pedidos add column if not exists repasse_falhou_em timestamptz;
alter table pedidos add column if not exists repasse_falha_motivo text;

-- Mesmo raciocínio do trigger de usuarios acima: essas colunas só podem ser
-- gravadas pelo backend (service_role). Sem isso, sob a RLS permissiva já
-- documentada em supabase_pedidos_migration.sql (using(true)/with
-- check(true)), qualquer sessão anon poderia forjar "repassado_em" pra
-- parecer que um repasse já saiu, ou trocar "modelo_pagamento" pra escapar
-- da cobrança de comissão.
create or replace function pedidos_lock_campos_repasse()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.modelo_pagamento is distinct from old.modelo_pagamento then
      new.modelo_pagamento := old.modelo_pagamento;
    end if;
    if new.valor_comissao is distinct from old.valor_comissao then
      new.valor_comissao := old.valor_comissao;
    end if;
    if new.valor_repasse is distinct from old.valor_repasse then
      new.valor_repasse := old.valor_repasse;
    end if;
    if new.asaas_payment_id_retencao is distinct from old.asaas_payment_id_retencao then
      new.asaas_payment_id_retencao := old.asaas_payment_id_retencao;
    end if;
    if new.retido_em is distinct from old.retido_em then
      new.retido_em := old.retido_em;
    end if;
    if new.repassado_em is distinct from old.repassado_em then
      new.repassado_em := old.repassado_em;
    end if;
    if new.repasse_asaas_transfer_id is distinct from old.repasse_asaas_transfer_id then
      new.repasse_asaas_transfer_id := old.repasse_asaas_transfer_id;
    end if;
    if new.repasse_liberado_por is distinct from old.repasse_liberado_por then
      new.repasse_liberado_por := old.repasse_liberado_por;
    end if;
    if new.repasse_falhou_em is distinct from old.repasse_falhou_em then
      new.repasse_falhou_em := old.repasse_falhou_em;
    end if;
    if new.repasse_falha_motivo is distinct from old.repasse_falha_motivo then
      new.repasse_falha_motivo := old.repasse_falha_motivo;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_campos_repasse on pedidos;
create trigger trg_lock_campos_repasse
  before update on pedidos
  for each row execute function pedidos_lock_campos_repasse();

-- ─── 3. repasses_log — log dedicado (não existe nada reaproveitável hoje) ─
create table if not exists repasses_log (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references pedidos(id),
  evento     text not null,
  detalhe    jsonb,
  criado_em  timestamptz not null default now()
);

do $$ begin
  alter table repasses_log add constraint repasses_log_evento_check
    check (evento in (
      'retencao_criada','retencao_confirmada',
      'repasse_tentado','repasse_ok','repasse_falhou'
    ));
exception when duplicate_object then null; end $$;

create index if not exists idx_repasses_log_pedido_id on repasses_log (pedido_id);

-- RLS: mesmo padrão permissivo do resto do projeto pra leitura (o painel
-- admin vai ler isso direto), mas escrita só pelo backend — é um log de
-- dinheiro, não um formulário de usuário.
alter table repasses_log enable row level security;

drop policy if exists "Leitura publica de repasses_log" on repasses_log;
create policy "Leitura publica de repasses_log"
  on repasses_log
  for select
  to anon, authenticated
  using (true);

-- Sem policy de insert/update pra anon/authenticated de propósito — só
-- service_role escreve (RLS nega por padrão o que não tem policy).

-- ─── Confirme que tudo existe (rode agora e de novo depois de alguns minutos) ──
select column_name, column_default from information_schema.columns
  where table_name = 'usuarios' and column_name in ('modelo_cobranca','pix_key','pix_key_tipo');

select column_name from information_schema.columns
  where table_name = 'pedidos' and column_name in (
    'modelo_pagamento','valor_comissao','valor_repasse','asaas_payment_id_retencao',
    'retido_em','repassado_em','repasse_asaas_transfer_id','repasse_liberado_por',
    'repasse_falhou_em','repasse_falha_motivo'
  );

select to_regclass('public.repasses_log') as tabela_existe;

select tgname from pg_trigger
  where tgname in ('trg_lock_modelo_cobranca','trg_lock_campos_repasse');

-- Confirma que 100% dos profissionais existentes ficaram em 'mensalidade'
-- (nenhum grandfathered foi migrado à força).
select modelo_cobranca, count(*) from usuarios group by modelo_cobranca;
