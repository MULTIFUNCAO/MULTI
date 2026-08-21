-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 2 do plano "Modelo de Comissão 15% + Pagamento Intermediado":
-- limite de até 6 profissionais respondendo à mesma oportunidade (ordem de
-- chegada), sem custo pra responder.
--
-- Mesmo padrão já usado em trg_block_proposta_sem_docs
-- (supabase_bloqueio_doc_pendente_migration.sql): trigger BEFORE INSERT em
-- "propostas", security definer, ignorado quando quem grava é service_role
-- (backend). Não precisa de endpoint novo nem mexe em App.jsx/server.js —
-- INSERT em "propostas" já vai direto do browser com a chave anon hoje (não
-- existe endpoint de "candidatar-se"), então o bloqueio tem que morar aqui.
--
-- Por que trigger e não checagem só no client: sob a RLS permissiva já
-- documentada (using(true)/with check(true)), qualquer sessão anon insere
-- direto — um cap checado só no front tem corrida real (N profissionais
-- respondendo ao mesmo tempo podem todos ver "cabe" e estourar o limite).
-- "perform ... for update" trava a linha do pedido antes de contar,
-- serializando candidaturas concorrentes ao mesmo pedido — mesmo padrão de
-- lock usado em debitar_moedas
-- (MULTI-BACKEND/supabase_moedas_debito_oportunidade_migration.sql).
--
-- Reaproveitamento de candidatura existente (upsert com onConflict:
-- "pedido_id,profissional_id" em App.jsx) vira UPDATE, não INSERT — não
-- passa por este trigger, então um profissional que já respondeu e edita
-- sua proposta não conta de novo pro limite. Isso é intencional.
--
-- IMPORTANTE (bug conhecido deste projeto Supabase): DDL já reverteu
-- sozinho depois de "confirmado". Rode o teste de sanidade no fim, espere
-- alguns minutos, e rode de novo (reler com a chave anon) antes de
-- considerar concluído.

create or replace function propostas_block_insert_limite_candidatos()
returns trigger as $$
declare
  v_count int;
begin
  if auth.role() is distinct from 'service_role' then
    perform 1 from pedidos where id = new.pedido_id for update;

    select count(*) into v_count from propostas where pedido_id = new.pedido_id;
    if v_count >= 6 then
      raise exception 'Limite de 6 profissionais respondendo a esta oportunidade já foi atingido.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_limite_candidatos_propostas on propostas;
create trigger trg_limite_candidatos_propostas
  before insert on propostas
  for each row execute function propostas_block_insert_limite_candidatos();

-- ─── Confirme que existe (rode agora e de novo depois de alguns minutos) ──
select tgname from pg_trigger where tgname = 'trg_limite_candidatos_propostas';

-- Teste de sanidade (manual, opcional) — contra um pedido de teste real com
-- 6 propostas já existentes: a 7ª candidatura (email novo) deve falhar com
-- a mensagem acima; um upsert do MESMO profissional_id de uma das 6
-- (update, não insert) deve continuar funcionando normalmente.
