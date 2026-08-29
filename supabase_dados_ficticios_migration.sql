-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Feature "Dados Fictícios" (plano aprovado 2026-08-27, ver memória
-- multi_dados_ficticios_plano): pedidos fictícios criados pelo Admin pra
-- preencher o mural do profissional (ProfessionalHome, App.jsx) quando uma
-- cidade/categoria nova ainda não tem demanda real suficiente. Substitui o
-- SEED_FEED hardcoded que existia antes (11 pedidos fake fixos, sem
-- etiqueta nenhuma, indistinguíveis de reais) — esse mecanismo antigo foi
-- removido do App.jsx na mesma leva de commits desta migration.
--
-- Idempotente (if not exists em tudo) — seguro rodar de novo.

-- 1. origem: 'real' (default, todo pedido existente e todo pedido criado
-- pelo fluxo normal do cliente) ou 'demo' (só criado pelo Admin, nunca pelo
-- app). Toda leitura de métrica/financeiro/comissão deve excluir 'demo'.
alter table pedidos add column if not exists origem text not null default 'real';

alter table pedidos drop constraint if exists pedidos_origem_check;
alter table pedidos add constraint pedidos_origem_check
  check (origem in ('real','demo'));

-- 2. demo_ativo: toggle de pausar/ativar no Admin sem precisar de DELETE
-- (ver histórico de bug de durabilidade em DELETE — supabase_multifuncao_project
-- na memória). Só tem sentido pra origem='demo'; fica true por padrão pra
-- não afetar pedidos reais.
alter table pedidos add column if not exists demo_ativo boolean not null default true;

-- 3. Índice parcial — a Admin lista/filtra só as linhas fictícias o tempo
-- todo (aba "Fictícios"), e o mural do profissional também filtra por
-- origem='demo' quando completa o feed. Um índice parcial cobre os dois
-- sem pesar nas leituras muito mais frequentes de pedidos reais.
create index if not exists idx_pedidos_origem_demo on pedidos (created_at desc) where origem = 'demo';

-- 4. RLS de leitura: nenhuma policy nova necessária — "Leitura publica de
-- pedidos" (supabase_pedidos_migration.sql) já usa using(true) e cobre a
-- coluna nova automaticamente. Criação/edição de pedido fictício acontece só
-- pelo backend Admin (server.js, autenticado com x-admin-key + service_role),
-- nunca pelo client anônimo.

-- 5. RLS de escrita em "propostas" — ACHADO E CORRIGIDO 2026-08-29: a policy
-- de INSERT "Cadastro publico de propostas" tinha with_check = true, sem
-- nenhuma restrição. O bloqueio de "não pode se candidatar a pedido
-- fictício" em App.jsx (candidatarSe/onClick do botão) é só UX — qualquer
-- profissional podia inserir uma proposta pra um pedido origem='demo' direto
-- via REST com a chave anon (comprovado com um pedido de teste real: POST
-- retornava 201 antes da correção, mesmo payload retorna 401/RLS depois).
-- Reaperta a policy pra também exigir que o pedido referenciado não seja
-- demo — mantém tudo mais igual (qualquer um ainda pode propor pra pedido
-- real, sem exigir login/matching de categoria, que já era assim antes).
alter policy "Cadastro publico de propostas" on propostas
  with check (
    not exists (
      select 1 from pedidos p
      where p.id::text = propostas.pedido_id and p.origem = 'demo'
    )
  );
