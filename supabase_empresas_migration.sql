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

-- 4. Colunas para o cadastro de empresa parceira (CadastroEmpresaScreen).
-- "cnpj" já existe (item 1). "nome" já existe e passa a representar o
-- nome fantasia (é o que aparece nos cards/perfil público).
alter table empresas
  add column if not exists razao_social text,
  add column if not exists email text,
  add column if not exists user_id uuid references auth.users(id);

-- 5. RLS: permite que o cadastro público (chave anon, sem sessão logada -
-- o fluxo de cadastro deste app não usa sessão real do Supabase Auth no
-- frontend) crie a linha da empresa. Sem isso, o INSERT do cadastro é
-- silenciosamente bloqueado por RLS assim que ela foi habilitada no item 3.
drop policy if exists "Cadastro publico de empresas" on empresas;
create policy "Cadastro publico de empresas"
  on empresas
  for insert
  to anon, authenticated
  with check (true);

-- 6. RLS: permite que a empresa edite seu próprio cadastro (telefone,
-- descrição, logo) na EmpresaHomeScreen. Mesma ressalva do item 5: como
-- o app não usa sessão real do Supabase Auth no frontend (só a chave
-- anon), não dá pra restringir via auth.uid() = user_id de verdade —
-- a policy fica permissiva, igual ao INSERT do item 5. Sem isso, o botão
-- "Salvar alterações" falha silenciosamente (RLS bloqueia sem erro).
drop policy if exists "Edicao publica de empresas" on empresas;
create policy "Edicao publica de empresas"
  on empresas
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 7. Coluna de presença online/offline (EmpresaHomeScreen "Ficar Online"/"Ficar Offline").
-- Reflete no RadarSearchScreen: quando false, o card da empresa aparece com o selo
-- "Fechado no momento" (esmaecido, mas ainda visível e clicável).
alter table empresas
  add column if not exists status boolean not null default false;

-- 8. Player id do OneSignal (subscription id do navegador), salvo toda vez que a
-- empresa fica online. Usado por api/notify-pedido.js pra saber pra quem mandar
-- o push quando um pedido novo bate com a categoria_servico da empresa.
alter table empresas
  add column if not exists onesignal_player_id text;
