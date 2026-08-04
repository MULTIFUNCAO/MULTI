-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- "urgencia"/"quando_precisa"/"material_fornecido" (NovaDemandaFuncionarioScreen, ver
-- App.jsx ~linha 1565) nunca tiveram migration própria no repo — foram adicionadas direto
-- no SQL Editor e sumiram mais de uma vez pelo bug de DDL não-durável já documentado em
-- supabase_multifuncao_project.md / chamado de suporte aberto. Reconstruído aqui a partir
-- do uso real no código pra ficar versionado.

alter table pedidos
  add column if not exists urgencia text not null default 'normal';

alter table pedidos drop constraint if exists pedidos_urgencia_check;
alter table pedidos add constraint pedidos_urgencia_check
  check (urgencia in ('normal', 'urgente', 'muito_urgente'));

-- Texto livre — usuário escolhe entre um dos presets ("Hoje", "Amanhã", "Esta semana",
-- "Flexível") ou digita algo customizado (ex: uma data), por isso sem check constraint.
alter table pedidos
  add column if not exists quando_precisa text;

alter table pedidos
  add column if not exists material_fornecido boolean not null default false;
