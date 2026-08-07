-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- MITIGAÇÃO EMERGENCIAL v3 (2026-08-06) — a v2 corrigiu
-- usuarios_block_online_sem_docs pra nunca acessar campo estático
-- new.doc_rg_status (usa to_jsonb), mas o erro "record new has no field
-- doc_rg_status" continuou. Causa real: o trigger MAIS ANTIGO
-- usuarios_lock_doc_status_to_admin (criado em
-- supabase_pendencias_doc_pagamento_migration.sql, o que impede
-- auto-aprovação de documento) AINDA faz referência estática a
-- new.doc_rg_status/doc_crim_status/doc_address_status sem proteção
-- nenhuma — e ele dispara em QUALQUER UPDATE em usuarios (não só ao
-- ficar online), então quebra a operação inteira antes mesmo do trigger
-- novo entrar em ação.
--
-- Essa versão aplica o mesmo padrão to_jsonb/->> nesse trigger antigo
-- também. Comportamento funcional idêntico ao original quando as colunas
-- existem (continua travando auto-aprovação); se as colunas sumirem de
-- novo, esse trigger simplesmente não faz nada (não tem o que proteger
-- mesmo, já que a coluna não existe pra escrever).

create or replace function usuarios_lock_doc_status_to_admin()
returns trigger as $$
declare
  v_new jsonb;
  v_old jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    if v_new ? 'doc_rg_status' then
      if v_new->>'doc_rg_status' is distinct from v_old->>'doc_rg_status'
         and v_new->>'doc_rg_status' in ('verified','rejected') then
        new.doc_rg_status := old.doc_rg_status;
      end if;
      if v_new->>'doc_crim_status' is distinct from v_old->>'doc_crim_status'
         and v_new->>'doc_crim_status' in ('verified','rejected') then
        new.doc_crim_status := old.doc_crim_status;
      end if;
      if v_new->>'doc_address_status' is distinct from v_old->>'doc_address_status'
         and v_new->>'doc_address_status' in ('verified','rejected') then
        new.doc_address_status := old.doc_address_status;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
