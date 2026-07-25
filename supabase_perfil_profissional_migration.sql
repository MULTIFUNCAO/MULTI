-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Suporta a etapa "Complete seu perfil" (pós-cadastro/plano, só profissional)
-- e a exibição de foto/bio real do profissional em PropostasScreen. Antes
-- disso, avatar e portfólio do profissional só existiam em sessionStorage/
-- estado local do navegador (nunca persistiam no Supabase).

alter table usuarios
  add column if not exists foto_perfil_url text,
  add column if not exists bio text,
  add column if not exists portfolio text[];
