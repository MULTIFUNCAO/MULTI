-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 3 da reforma comercial: opções A/B de valor na criação do pedido.
-- A = "A partir de quanto você pretende investir?" — cliente informa um
--     valor de referência, não vinculante (profissional pode propor outro
--     valor normalmente pelo chat_propostas_valor).
-- B = "Não sei quanto custa" — cliente não informa valor nenhum, pedido
--     fica "a combinar" e o profissional propõe do zero pelo chat.
-- A diferença entre A e B é só a presença ou não de um valor de referência
-- inicial — a negociação via chat_propostas_valor funciona igual nos dois
-- casos. pedidos.valor já era nullable antes desta migration (nunca teve
-- NOT NULL), então B só significa valor:null.
--
-- NOTA: já aplicado manualmente em produção 2026-08-10 (coluna + backfill
-- 'referencia' numa sessão anterior; constraint adicionada nesta sessão,
-- ambos confirmados via SELECT/pg_constraint direto no painel). Este
-- arquivo documenta o que já rodou, seguindo o padrão dos outros
-- `supabase_*_migration.sql` do repo — não é preciso rodar de novo.
alter table pedidos add column if not exists tipo_valor text not null default 'referencia';

alter table pedidos drop constraint if exists pedidos_tipo_valor_check;
alter table pedidos add constraint pedidos_tipo_valor_check
  check (tipo_valor in ('referencia', 'a_combinar'));
