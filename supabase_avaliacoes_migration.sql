-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema real da tabela "avaliacoes", que hoje só existe
-- "de fato" no painel do Supabase (nunca teve migration própria no repo).
--
-- Contexto: existiam dois componentes no front-end inserindo em "avaliacoes"
-- com schemas diferentes — um deles ("ChatScreen", código morto, nunca
-- renderizado em nenhuma tela do app) usava {cliente_id, profissional_nome,
-- estrelas, comentario, created_at}, e é esse o schema que a tabela real
-- acabou tendo. O componente que ESTÁ no fluxo real ("AvaliacaoScreen") sempre
-- tentou inserir {pedido_id, cliente_id, profissional_id, nota, comentario} —
-- colunas que não existiam, então toda avaliação real falhava silenciosamente
-- com erro "42703 column avaliacoes.nota does not exist". A tabela estava
-- vazia (0 linhas) no momento desta migration — sem risco de perda de dado.
--
-- Esta migration alinha a tabela real ao schema do componente que de fato
-- fica no app (AvaliacaoScreen) e remove o componente morto do código.

-- 1. Renomeia "estrelas" para "nota" só se ainda não tiver sido renomeado
-- (idempotente — seguro rodar mais de uma vez).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'avaliacoes' and column_name = 'estrelas'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'avaliacoes' and column_name = 'nota'
  ) then
    alter table avaliacoes rename column estrelas to nota;
  end if;
end $$;

-- 2. Liga a avaliação ao pedido e ao profissional de forma estruturada
-- (necessário pras fases futuras de reputação/agregação — hoje não existe
-- nenhuma leitura de "avaliacoes" em lugar nenhum do app).
alter table avaliacoes
  add column if not exists pedido_id uuid references pedidos(id);

alter table avaliacoes
  add column if not exists profissional_id text;

-- "profissional_nome" e "cliente_id" já existem na tabela real e continuam
-- como estão — profissional_nome fica como campo denormalizado (evita join
-- em telas futuras de reputação), profissional_id é a chave estruturada.

-- 3. RLS: mesmo padrão permissivo documentado em supabase_pedidos_migration.sql
-- (sem sessão real do Supabase Auth no frontend, então não dá pra restringir
-- por auth.uid()).
alter table avaliacoes enable row level security;

drop policy if exists "Leitura publica de avaliacoes" on avaliacoes;
create policy "Leitura publica de avaliacoes"
  on avaliacoes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de avaliacoes" on avaliacoes;
create policy "Cadastro publico de avaliacoes"
  on avaliacoes
  for insert
  to anon, authenticated
  with check (true);
