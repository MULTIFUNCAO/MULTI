-- Admin Dashboard: aprovação de profissional (2026-08-07)
--
-- Não existe hoje nenhuma coluna que represente "profissional aprovado pelo
-- admin" — as colunas doc_rg_status/doc_crim_status/doc_address_status que
-- cumpriam esse papel sumiram de novo (bug de DDL recorrente já registrado,
-- ver memória do projeto). Em vez de depender delas, esta coluna é nova e
-- simples.
--
-- Default TRUE (fail-open) de propósito: mantém a mesma postura da mitigação
-- de emergência já em produção (commit 46f7ef6 no MULTI) — nenhum profissional
-- existente fica bloqueado por essa migration. Reprovar é uma ação manual do
-- admin a partir de agora, não um estado inicial.
--
-- Rodar no SQL Editor do Supabase (projeto "multifuncao", ref nlpfjkxqypveontunrxj).
-- Depois de rodar, confirme com o SELECT no final — o Table Editor já enganou
-- uma vez achando que uma coluna tinha sido criada quando não tinha.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

-- Confirmação:
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'approved';
