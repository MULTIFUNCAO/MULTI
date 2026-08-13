-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
-- Projeto "multifuncao", ref nlpfjkxqypveontunrxj.
--
-- Bug achado em teste manual (2026-08-12): a tela de upload do RG/CNH dizia
-- "Frente e verso legível", mas o sistema aceitava 1 foto só e já marcava
-- "Em análise" — sem exigir a segunda face nem esperar as duas antes de
-- disparar a pré-checagem por IA.
--
-- Este script só adiciona a coluna que faltava pra guardar o verso
-- (doc_rg_url já existe e agora vira "frente") e libera o novo estado
-- intermediário "frente_enviada" no CHECK de doc_rg_status — o app já foi
-- ajustado (App.jsx) pra só marcar "analysis"/chamar a IA depois das duas
-- fotos.
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK revertendo
-- sozinhos depois de confirmados (ver memória "Supabase multifuncao project").
-- Depois de rodar, confirme com o SELECT no final.

alter table usuarios
  add column if not exists doc_rg_url_verso text;

alter table usuarios drop constraint if exists usuarios_doc_rg_status_check;
alter table usuarios add constraint usuarios_doc_rg_status_check
  check (doc_rg_status in ('pending','frente_enviada','analysis','verified','rejected'));

-- Confirmação:
select column_name, data_type
from information_schema.columns
where table_name = 'usuarios' and column_name = 'doc_rg_url_verso';

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'usuarios'::regclass and conname = 'usuarios_doc_rg_status_check';
