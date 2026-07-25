-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Achado testando a Fase 4: a migration antiga de "avaliacoes" documentava
-- policies de select/insert públicas, mas o insert real está sendo rejeitado
-- por RLS ("new row violates row-level security policy") — a policy
-- documentada não corresponde ao que está de fato no banco. Recria as
-- policies do zero, mesmo padrão já usado em mensagens/propostas. Idempotente.

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
