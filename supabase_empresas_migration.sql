-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).

-- 1. Tabela "empresas" (empresas parceiras)
create table if not exists empresas (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  cnpj              text,
  logo_url          text,
  descricao         text,
  categoria_servico text,
  telefone_contato  text,
  ativo             boolean not null default true,
  criado_em         timestamp not null default now()
);

-- 2. Coluna "empresa_id" na tabela "usuarios" existente
alter table usuarios
  add column if not exists empresa_id uuid references empresas(id);
