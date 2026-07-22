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

-- 3. RLS: permite leitura pública (anon + authenticated) de empresas ativas.
-- Sem isso, se RLS estiver habilitado na tabela e não houver nenhuma policy
-- de SELECT, toda leitura via chave anon retorna sempre 0 linhas, sem erro.
alter table empresas enable row level security;

drop policy if exists "Leitura publica de empresas ativas" on empresas;
create policy "Leitura publica de empresas ativas"
  on empresas
  for select
  to anon, authenticated
  using (ativo = true);
