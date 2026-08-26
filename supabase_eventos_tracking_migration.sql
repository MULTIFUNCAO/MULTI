-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 3a do CRM Admin (ver plano faseado na memória do projeto,
-- multi_admin_crm_plano): infra de rastreamento de eventos. Pré-requisito
-- técnico pra tudo que falta no roadmap (coluna "Buscas" em Categorias,
-- "última visita"/comportamento em destaque, "usuários online agora",
-- gráfico de visitas por horário, timeline por cliente/profissional na
-- Fase 4, score do cliente na Fase 4). Idempotente (if not exists em tudo).
--
-- IMPORTANTE (bug conhecido deste projeto Supabase): DDL já reverteu
-- sozinho depois de "confirmado", inclusive CREATE TABLE inteiro
-- desaparecendo entre a execução e a reconferência minutos depois (ver
-- ticket SU-451248, ainda em aberto). Rode o teste de sanidade no fim,
-- espere alguns minutos, e rode de novo (relendo com a chave anon/
-- REST API, não só o resultado do próprio SQL Editor) antes de considerar
-- concluído. NÃO rode a instrumentação client-side (Fase 3a, parte 2)
-- antes disso estar confirmado — sem a tabela existindo de verdade, os
-- inserts do frontend falhariam silenciosamente (a UI não trava por causa
-- de evento, mas nenhum dado seria coletado).

-- ─── 1. eventos — log genérico de comportamento ───────────────────────────
create table if not exists eventos (
  id             uuid primary key default gen_random_uuid(),
  criado_em      timestamptz not null default now(),

  -- Ator: nem todo evento vem de usuário logado (busca/navegação podem
  -- acontecer como convidado). usuario_email fica nulo até o login;
  -- session_id (gerado no client, guardado em localStorage, sobrevive
  -- entre telas mas não entre navegadores/dispositivos) permite juntar o
  -- comportamento de convidado ao histórico depois que a pessoa loga.
  usuario_email  text,
  session_id     text not null,

  -- O quê: tipo fechado (não é jsonb solto) porque "Buscas" por categoria
  -- e "usuários online agora" fazem GROUP BY/filtro direto nisso.
  tipo_evento    text not null,

  -- Categoria fica em coluna própria (redundante com o que já pode estar
  -- em detalhe) pelo mesmo motivo de performance — é a query mais pesada
  -- do roadmap (coluna "Buscas" da aba Categorias).
  categoria      text,

  -- Alvo opcional do evento (ex.: email do profissional visitado num
  -- view_perfil, id do pedido numa visita à tela de detalhe). Texto puro,
  -- não FK — o alvo muda de tabela dependendo do tipo_evento.
  alvo_tipo      text,
  alvo_id        text,

  -- Tela/rota onde o evento aconteceu (valor do "screen" do App.jsx,
  -- ex. "home", "service", "profile") — dá pra reconstruir navegação sem
  -- precisar de um evento dedicado por tela.
  tela           text,

  -- Extra livre por tipo de evento (termo de busca, filtros aplicados,
  -- duração, etc.) — só pra dado que não vale a pena virar coluna própria.
  detalhe        jsonb,

  -- web (navegador) vs android (Capacitor) — útil pra separar
  -- comportamento entre as duas plataformas nos relatórios.
  plataforma     text
);

do $$ begin
  alter table eventos add constraint eventos_tipo_evento_check
    check (tipo_evento in (
      'visita_tela','busca','clique','view_perfil',
      'view_pedido','filtro_aplicado'
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table eventos add constraint eventos_plataforma_check
    check (plataforma is null or plataforma in ('web','android'));
exception when duplicate_object then null; end $$;

-- ─── 2. Índices pras queries já mapeadas no roadmap ────────────────────────
-- "Buscas" por categoria (Fase 3b, aba Categorias)
create index if not exists idx_eventos_categoria_tipo
  on eventos (categoria, tipo_evento) where categoria is not null;

-- "Última visita"/timeline por usuário logado (Fase 3b/4a)
create index if not exists idx_eventos_usuario_criado
  on eventos (usuario_email, criado_em desc) where usuario_email is not null;

-- "Usuários online agora" + gráfico de visitas por horário (Fase 3b) —
-- ambos filtram por uma janela recente de criado_em.
create index if not exists idx_eventos_criado_em
  on eventos (criado_em desc);

-- Timeline por sessão de convidado, pra linkar ao usuário depois do login
-- (Fase 4a) — sem isso, o comportamento pré-login fica órfão.
create index if not exists idx_eventos_session
  on eventos (session_id, criado_em desc);

-- ─── 3. RLS ─────────────────────────────────────────────────────────────
-- Mais restrita que o padrão do resto do projeto de propósito: é dado
-- comportamental (o que cada um buscou/visitou), mais sensível que log de
-- dinheiro (repasses_log). INSERT fica permissivo (é o único jeito de
-- registrar evento de convidado não-logado, sem sessão real do Supabase
-- Auth ainda). SELECT não tem policy nenhuma pra anon/authenticated —
-- só service_role lê, e os endpoints /api/admin/* já usam essa chave no
-- backend (nunca a chave anon direto do frontend).
alter table eventos enable row level security;

drop policy if exists "Insercao publica de eventos" on eventos;
create policy "Insercao publica de eventos"
  on eventos
  for insert
  to anon, authenticated
  with check (true);

-- Sem policy de select/update/delete pra anon/authenticated de propósito —
-- RLS nega por padrão o que não tem policy. Update/delete nem pro
-- service_role fazem sentido aqui (é log de evento, não estado mutável).

-- ─── Confirme que tudo existe (rode agora e de novo depois de alguns minutos) ──
select to_regclass('public.eventos') as tabela_existe;

select column_name from information_schema.columns
  where table_name = 'eventos'
  order by ordinal_position;

select indexname from pg_indexes where tablename = 'eventos';

select conname from pg_constraint
  where conrelid = 'eventos'::regclass;
