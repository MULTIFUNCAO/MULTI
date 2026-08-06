-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Item 2 do pedido "bloqueio de documentação pendente" (2026-08-06):
-- hoje a tela de Perfil já mostra o status "Pendente" pra RG/CNH,
-- Antecedentes Criminais e Comprovante de Endereço (ver doc_rg_status /
-- doc_crim_status / doc_address_status, criadas em
-- supabase_pendencias_doc_pagamento_migration.sql), mas isso era só
-- visual — nada impedia o profissional de ficar online ou se candidatar
-- a pedidos com documentação pendente.
--
-- O app (App.jsx) já esconde/desabilita os botões de "Ficar Online" e
-- "Candidatar-me" no front quando allDocsVerified é false, mas as
-- escritas em "usuarios" e "propostas" vão direto pro Supabase com a
-- anon key (não existe endpoint no backend pra "ficar online" nem pra
-- "candidatar-se") — então qualquer sessão consegue fazer o UPDATE/INSERT
-- direto pelo console do navegador, contornando o front inteiro. Este
-- script fecha essa brecha no próprio Postgres, mesmo padrão de trigger
-- já usado pra travar quem pode marcar doc_*_status como "verified"
-- (usuarios_lock_doc_status_to_admin).
--
-- Diferença importante pro trigger de doc_status: aquele reverte o valor
-- em silêncio (o UPDATE "funciona" mas o campo não muda). Os triggers
-- abaixo usam RAISE EXCEPTION — um UPDATE/INSERT bloqueado por eles volta
-- como erro de verdade pro app, não como sucesso silencioso. Isso é de
-- propósito: já vimos nesse projeto um bug real (categoria de serviço não
-- persistindo) causado exatamente por um UPDATE que "dava certo" sem
-- bloquear nada de verdade — reversão silenciosa aqui reproduziria o
-- mesmo problema pro "Ficar Online".
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project").
-- Se depois de rodar isso o bloqueio parar de funcionar sozinho, não rode
-- este script de novo por cima — abra ticket de suporte com a Supabase
-- primeiro, é sintoma de um bug da plataforma, não de erro neste script.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) USUARIOS — impede ficar online (status:true) com documentação
--    obrigatória pendente. Só vale pra role='professional' — cliente e
--    empresa não passam por verificação de documento nenhuma (ficariam
--    bloqueados à toa se o gate valesse pra eles). service_role (backend)
--    sempre passa direto, mesma exceção do trigger de doc_status.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function usuarios_block_online_sem_docs()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role'
     and new.role = 'professional'
     and new.status = true
     and (old.status is distinct from new.status)
  then
    if coalesce(new.doc_rg_status, 'pending')      <> 'verified'
       or coalesce(new.doc_crim_status, 'pending')    <> 'verified'
       or coalesce(new.doc_address_status, 'pending') <> 'verified'
    then
      raise exception 'Documentação obrigatória pendente — não é possível ficar online.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_block_online_sem_docs on usuarios;
create trigger trg_block_online_sem_docs
  before update on usuarios
  for each row execute function usuarios_block_online_sem_docs();

-- ─────────────────────────────────────────────────────────────────────────
-- 2) PROPOSTAS — impede o profissional de se candidatar/aceitar pedido
--    (INSERT em "propostas", que é como o cliente passa a poder liberar
--    contato pra ele) com documentação obrigatória pendente. Cobre tanto
--    o "Tenho Interesse"/"Candidatar-me" do mural quanto o "Aceitar agora"
--    do popup de novo pedido — os dois inserem/upsertam nessa tabela.
--    profissional_id sem linha correspondente em "usuarios" (candidatura
--    de empresa, que vive em outra tabela) fica fora do escopo dessa
--    trava — não é o que essa verificação de documento cobre.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function propostas_block_insert_sem_docs()
returns trigger as $$
declare
  v_role    text;
  v_rg      text;
  v_crim    text;
  v_address text;
begin
  if auth.role() is distinct from 'service_role' then
    select role, doc_rg_status, doc_crim_status, doc_address_status
      into v_role, v_rg, v_crim, v_address
    from usuarios
    where email = new.profissional_id;

    if v_role = 'professional'
       and (coalesce(v_rg, 'pending')      <> 'verified'
         or coalesce(v_crim, 'pending')    <> 'verified'
         or coalesce(v_address, 'pending') <> 'verified')
    then
      raise exception 'Documentação obrigatória pendente — não é possível se candidatar a pedidos.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_block_proposta_sem_docs on propostas;
create trigger trg_block_proposta_sem_docs
  before insert on propostas
  for each row execute function propostas_block_insert_sem_docs();
