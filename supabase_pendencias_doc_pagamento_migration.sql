-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Parte do prompt "Ajustes de Cadastro, Perfil e Fluxos" (2026-08-05):
--   1) cadastro híbrido cliente+profissional com pendências de documentação
--   3) status real de documentação do profissional (hoje é só estado local,
--      nunca persiste — ver TODO em App.jsx)
--   4) bloqueio de contato enquanto documentação obrigatória está pendente
--   2) remoção do trial de 7 dias / pagamento imediato em plano pago
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project").
-- Se depois de rodar isso as colunas/policies não aparecerem mais (ou
-- reaparecer o "using(true)/with check(true)" antigo em assinaturas), não
-- rode este script de novo por cima — abra ticket de suporte com a Supabase
-- primeiro, é sintoma de um bug da plataforma, não de erro neste script.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) USUARIOS — status real de documentação + aceite da Declaração de
--    Autonomia + flag de conta híbrida (cliente + profissional)
-- ─────────────────────────────────────────────────────────────────────────
alter table usuarios
  add column if not exists doc_rg_status      text not null default 'pending',
  add column if not exists doc_rg_url         text,
  add column if not exists doc_crim_status    text not null default 'pending',
  add column if not exists doc_crim_url       text,
  add column if not exists doc_address_status text not null default 'pending',
  add column if not exists doc_address_url    text,
  add column if not exists autonomia_aceita_em timestamptz,
  add column if not exists is_hybrid          boolean not null default false;

do $$ begin
  alter table usuarios add constraint usuarios_doc_rg_status_check
    check (doc_rg_status in ('pending','analysis','verified','rejected'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table usuarios add constraint usuarios_doc_crim_status_check
    check (doc_crim_status in ('pending','analysis','verified','rejected'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table usuarios add constraint usuarios_doc_address_status_check
    check (doc_address_status in ('pending','analysis','verified','rejected'));
exception when duplicate_object then null; end $$;

-- Trava de segurança: usuários já podem fazer update("usuarios") livremente
-- via anon key (mesmo padrão permissivo do resto do app), então nada impede
-- o próprio usuário de gravar doc_rg_status="verified" direto pelo console.
-- Este trigger bloqueia QUALQUER sessão que não seja o backend (service_role,
-- usado só pelo endpoint /api/admin/documentos/verificar) de setar um status
-- de documento pra "verified"/"rejected" — client só pode ir até "analysis".
create or replace function usuarios_lock_doc_status_to_admin()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.doc_rg_status is distinct from old.doc_rg_status
       and new.doc_rg_status in ('verified','rejected') then
      new.doc_rg_status := old.doc_rg_status;
    end if;
    if new.doc_crim_status is distinct from old.doc_crim_status
       and new.doc_crim_status in ('verified','rejected') then
      new.doc_crim_status := old.doc_crim_status;
    end if;
    if new.doc_address_status is distinct from old.doc_address_status
       and new.doc_address_status in ('verified','rejected') then
      new.doc_address_status := old.doc_address_status;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_doc_status on usuarios;
create trigger trg_lock_doc_status
  before update on usuarios
  for each row execute function usuarios_lock_doc_status_to_admin();

-- ─────────────────────────────────────────────────────────────────────────
-- 2) ASSINATURAS — colunas pra cobrança real via Asaas + travar quem pode
--    ativar um plano
-- ─────────────────────────────────────────────────────────────────────────
alter table assinaturas
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_payment_id  text,
  add column if not exists proxima_cobranca  timestamptz;

-- ⚠️ CRÍTICO: as policies "Cadastro publico de assinaturas" e "Edicao
-- publica de assinaturas" (supabase_assinaturas_migration.sql) usam
-- with check(true) — isso significa que, hoje, QUALQUER cliente com a anon
-- key consegue se auto-ativar um plano pago (status:'ativa') direto pelo
-- console do navegador, sem pagar nada. Trocando por policies que só o
-- backend (service_role, via SUPABASE_SERVICE_KEY no Render) pode
-- inserir/editar — o app continua podendo LER o plano normalmente (policy
-- de select pública não muda).
drop policy if exists "Cadastro publico de assinaturas" on assinaturas;
drop policy if exists "Edicao publica de assinaturas" on assinaturas;

create policy "Somente backend cria assinatura"
  on assinaturas
  for insert
  to service_role
  with check (true);

create policy "Somente backend edita assinatura"
  on assinaturas
  for update
  to service_role
  using (true)
  with check (true);

-- status agora tem uma cobrança real que pode ficar pendente até o Asaas
-- confirmar (cartão em análise) — adiciona esse estado ao enum de status.
do $$ begin
  alter table assinaturas drop constraint if exists assinaturas_status_check;
  alter table assinaturas add constraint assinaturas_status_check
    check (status in ('trial','pendente','ativa','inadimplente','cancelada','expirada'));
exception when duplicate_object then null; end $$;
