-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Radar de "Novo Pedido!" da empresa parceira (EmpresaHomeScreen): o match
-- hoje é só por categoria_servico. Pra também considerar cidade (mesmo
-- padrão do profissional autônomo, que já filtra por categoria + cidade em
-- demandas "pro"), a tabela "empresas" precisa dessa coluna — hoje ela não
-- existe (conferido em supabase_empresas_migration.sql).
-- Este script é idempotente.

alter table empresas add column if not exists cidade text;
