-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Espelha pro profissional (tabela "usuarios", role='professional') o mesmo
-- padrão de presença online + push já usado pelas empresas parceiras
-- (ver supabase_empresas_migration.sql, itens 7 e 8).

-- 1. Categoria de serviço do profissional (mesma lista de categorias usada
--    pelas empresas — CATS no frontend). Obrigatória antes de poder ficar
--    online (o app bloqueia isso na tela de perfil / "Ficar Online").
--    Não há campo de especialidade textual solto pra migrar: o cadastro de
--    profissional hoje não coleta categoria nenhuma, então a coluna nasce
--    vazia e é preenchida depois, no perfil.
alter table usuarios
  add column if not exists categoria_servico text;

-- 2. Presença online/offline (ProfessionalHome "Ficar Online"/"Ficar Offline").
--    Mesmo significado da coluna empresas.status.
alter table usuarios
  add column if not exists status boolean not null default false;

-- 3. Player id do OneSignal (subscription id do navegador), salvo toda vez que
--    o profissional fica online. Usado por api/notify-pedido.js pra saber
--    pra quem mandar o push quando um pedido novo bate com a categoria_servico
--    do profissional.
alter table usuarios
  add column if not exists onesignal_player_id text;

-- 4. RLS: só cria efeito se a tabela "usuarios" tiver row level security
--    habilitado (hoje não tem, pelo visto no restante do app — outras rotas já
--    fazem upsert/update nela livremente com a chave anon). Fica como seguro:
--    se algum dia RLS for ligado em "usuarios", estas policies continuam
--    permitindo o profissional atualizar sua própria categoria/status/player_id,
--    igual ao padrão adotado nas policies de "empresas".
drop policy if exists "Leitura publica de usuarios" on usuarios;
create policy "Leitura publica de usuarios"
  on usuarios
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Edicao publica de usuarios" on usuarios;
create policy "Edicao publica de usuarios"
  on usuarios
  for update
  to anon, authenticated
  using (true)
  with check (true);
