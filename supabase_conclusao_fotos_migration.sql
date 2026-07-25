-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fotos opcionais na confirmação de conclusão (além da observação em texto já
-- existente), uma coluna por lado, mesmo padrão de array de URLs já usado em
-- pedidos.fotos. Este script é idempotente.

alter table pedidos add column if not exists conclusao_fotos_cliente jsonb;
alter table pedidos add column if not exists conclusao_fotos_profissional jsonb;
