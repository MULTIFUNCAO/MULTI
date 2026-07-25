-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Achado testando "Minha Rede": o upsert de favoritar/convidar (INSERT ...
-- ON CONFLICT DO UPDATE) precisa de uma policy de UPDATE, que a migration
-- original não criou (só select/insert/delete) — sem ela, o upsert falha
-- com "new row violates row-level security policy" sempre que já existe uma
-- linha pro par empresa+profissional. Idempotente.

drop policy if exists "Atualizacao publica de rede" on empresa_rede_favoritos;
create policy "Atualizacao publica de rede"
  on empresa_rede_favoritos
  for update
  to anon, authenticated
  using (true)
  with check (true);
