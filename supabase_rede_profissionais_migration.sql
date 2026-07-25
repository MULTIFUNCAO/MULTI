-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- "Minha Rede de Profissionais" (Empresa Plus): guarda só o que não dá pra
-- derivar (favoritos manuais e convites). Profissionais que já concluíram um
-- serviço pra empresa entram na rede automaticamente, calculado ao vivo a
-- partir de "pedidos" — não tem linha aqui pra isso. Este script é idempotente.

create table if not exists empresa_rede_favoritos (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  empresa_email       text not null,
  profissional_email  text not null,
  origem              text not null default 'favoritado', -- 'favoritado' | 'convidado'
  unique (empresa_email, profissional_email)
);

alter table empresa_rede_favoritos enable row level security;

drop policy if exists "Leitura publica de rede" on empresa_rede_favoritos;
create policy "Leitura publica de rede"
  on empresa_rede_favoritos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Cadastro publico de rede" on empresa_rede_favoritos;
create policy "Cadastro publico de rede"
  on empresa_rede_favoritos
  for insert
  to anon, authenticated
  with check (true);

-- Precisa de policy de delete (pra "desfavoritar") — lição das fases
-- anteriores: mensagens/avaliacoes não têm, e qualquer DELETE vira um
-- no-op silencioso (HTTP 204 sem apagar nada).
drop policy if exists "Remocao publica de rede" on empresa_rede_favoritos;
create policy "Remocao publica de rede"
  on empresa_rede_favoritos
  for delete
  to anon, authenticated
  using (true);
