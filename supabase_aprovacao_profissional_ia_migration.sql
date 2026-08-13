-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
-- Projeto "multifuncao", ref nlpfjkxqypveontunrxj.
--
-- Fluxo de aprovação real de profissionais + pré-checagem por IA (2026-08-12).
--
-- Hoje existem DOIS sistemas de aprovação que não se falam:
--   1) usuarios.approved (boolean, default true) — só usado pelo painel Multi
--      Admin (AdminDashboard.jsx), mas nada no app lê essa coluna pra bloquear
--      nada. Selo cosmético (ver comentário em server.js perto de
--      /api/admin/professionals).
--   2) usuarios.doc_rg_status/doc_crim_status/doc_address_status — esse sim é
--      o gate real, reforçado nos triggers trg_block_online_sem_docs e
--      trg_block_proposta_sem_docs (supabase_bloqueio_doc_pendente_migration.sql),
--      mas só podia ser aprovado/reprovado pela própria tela de Perfil do
--      profissional, atrás de uma senha hardcoded — falha de segurança real
--      (qualquer profissional podia tentar se auto-aprovar).
--
-- Este script unifica tudo em "approved" como único gate real, revisado a
-- partir do documento RG/CNH (Antecedentes Criminais e Comprovante de
-- Endereço saem do bloqueio por ora — não existe hoje nenhuma UI de admin
-- legítima pra eles).
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project").
-- Depois de rodar, confirme com os SELECTs no final. Se algo sumir sozinho
-- depois, NÃO rode este script de novo por cima — abra ticket de suporte
-- com a Supabase primeiro, é sintoma de bug da plataforma, não de erro aqui.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) BACKFILL DEFENSIVO — antes de trocar o default, garante que nenhum
--    profissional já ativo hoje (approved NULL por já existir antes da
--    coluna, ou por causa do bug de durabilidade) fique bloqueado
--    retroativamente. Só toca linhas NULL — quem já é true/false explícito
--    não muda.
-- ─────────────────────────────────────────────────────────────────────────
update usuarios
  set approved = true
  where role = 'professional' and approved is null;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) TROCA O DEFAULT — só afeta cadastros novos a partir de agora. Quem já
--    tem approved=true (fluxo antigo fail-open) continua exatamente como
--    estava.
-- ─────────────────────────────────────────────────────────────────────────
alter table usuarios alter column approved set default false;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) TRAVA "approved" CONTRA ESCRITA DIRETA DO CLIENT — mesmo padrão já
--    usado pra doc_*_status (usuarios_lock_doc_status_to_admin). Sem isso,
--    qualquer profissional logado poderia rodar
--    supabase.from("usuarios").update({approved:true}) no console do
--    navegador e se auto-aprovar. Só service_role (o backend) pode mudar.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function usuarios_lock_approved_to_admin()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role'
     and new.approved is distinct from old.approved
  then
    new.approved := old.approved;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_approved on usuarios;
create trigger trg_lock_approved
  before update on usuarios
  for each row execute function usuarios_lock_approved_to_admin();

-- ─────────────────────────────────────────────────────────────────────────
-- 4) REDIRECIONA OS TRIGGERS DE BLOQUEIO JÁ EXISTENTES pra checar "approved"
--    em vez dos 3 doc_*_status. Mesmos nomes de trigger de
--    supabase_bloqueio_doc_pendente_migration.sql — só troca o corpo da
--    function, então já ficam ativos automaticamente (CREATE OR REPLACE).
--    coalesce(approved, true) = fail-open se a coluna sumir de novo pelo
--    bug de durabilidade (não trava todo mundo por um problema de infra).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function usuarios_block_online_sem_docs()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role'
     and new.role = 'professional'
     and new.status = true
     and (old.status is distinct from new.status)
  then
    if coalesce(new.approved, true) = false then
      raise exception 'Cadastro pendente de aprovação — não é possível ficar online.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
-- trigger trg_block_online_sem_docs já existe apontando pra essa function —
-- não precisa recriar o trigger, só a function acima.

create or replace function propostas_block_insert_sem_docs()
returns trigger as $$
declare
  v_role     text;
  v_approved boolean;
begin
  if auth.role() is distinct from 'service_role' then
    select role, approved into v_role, v_approved
    from usuarios
    where email = new.profissional_id;

    if v_role = 'professional' and coalesce(v_approved, true) = false then
      raise exception 'Cadastro pendente de aprovação — não é possível se candidatar a pedidos.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
-- trigger trg_block_proposta_sem_docs já existe apontando pra essa function —
-- não precisa recriar o trigger, só a function acima.

-- ─────────────────────────────────────────────────────────────────────────
-- 5) COLUNAS NOVAS — resultado da pré-checagem automática por IA (Claude
--    com visão) sobre o documento RG/CNH, só pra apoiar o admin na revisão.
--    Nunca aprova sozinha — só quem grava "approved" é o admin, no painel
--    Multi Admin.
-- ─────────────────────────────────────────────────────────────────────────
alter table usuarios
  add column if not exists analise_ia_status text,
  add column if not exists analise_ia_observacoes text,
  add column if not exists analise_ia_em timestamptz;

do $$ begin
  alter table usuarios add constraint usuarios_analise_ia_status_check
    check (analise_ia_status in ('ok','suspeito','ilegivel'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Confirmação — rode depois e confira o resultado.
-- ─────────────────────────────────────────────────────────────────────────
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'usuarios'
  and column_name in ('approved','analise_ia_status','analise_ia_observacoes','analise_ia_em')
order by column_name;

select tgname from pg_trigger
where tgrelid = 'usuarios'::regclass and tgname = 'trg_lock_approved';
