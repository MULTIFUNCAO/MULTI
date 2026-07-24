-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Permite profissionais e empresas terem mais de uma categoria de serviço
-- (ex: pedreiro + pintor). Antes, empresas.categoria_servico e
-- usuarios.categoria_servico eram "text" (uma categoria só); viram "text[]".

-- 1. Migra os valores existentes de text pra text[], sem perder dado
--    (ex: 'pedreiro' -> {pedreiro}; null continua null).
alter table empresas
  alter column categoria_servico type text[]
  using case when categoria_servico is null then null else array[categoria_servico] end;

alter table usuarios
  alter column categoria_servico type text[]
  using case when categoria_servico is null then null else array[categoria_servico] end;

-- 2. Índices GIN — o matching por categoria (api/notify-pedido.js,
--    EmpresaHomeScreen, RadarSearchScreen) passa a usar .contains()/.overlaps()
--    em vez de .ilike(), e esses operadores de array se beneficiam de GIN.
create index if not exists empresas_categoria_servico_gin on empresas using gin (categoria_servico);
create index if not exists usuarios_categoria_servico_gin on usuarios using gin (categoria_servico);
