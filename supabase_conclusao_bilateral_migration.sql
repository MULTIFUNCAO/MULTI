-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da Fase 4 (conclusão bilateral): os dois lados
-- (cliente e profissional) confirmam a conclusão de forma independente — só
-- quando os dois confirmarem é que pedidos.status vira "concluido" de fato.
-- Mesmo padrão de coluna pareada já usado no aceite formal (Fase 2). Este
-- script é idempotente.

alter table pedidos add column if not exists concluido_cliente_em timestamptz;
alter table pedidos add column if not exists concluido_profissional_em timestamptz;
alter table pedidos add column if not exists conclusao_observacao_cliente text;
alter table pedidos add column if not exists conclusao_observacao_profissional text;
