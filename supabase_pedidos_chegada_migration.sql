-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 5 do fluxo de chat: código de confirmação de início. Etapa NOVA antes
-- da conclusão (que já tem seu próprio PIN, ver supabase_conclusao_bilateral_
-- migration.sql) — não substitui aquela, fica antes dela no ciclo de vida.
--
-- chegada_solicitada_em: setado quando o profissional aperta "Cheguei ao
-- local" — a partir daí o código de início (calculado local, mesmo padrão
-- determinístico de generatePin) passa a aparecer pro cliente.
-- inicio_confirmado_em: setado quando o profissional digita o código certo
-- (recebido verbalmente do cliente) e o pedido vira "executando".
-- Este script é idempotente.

alter table pedidos add column if not exists chegada_solicitada_em timestamptz;
alter table pedidos add column if not exists inicio_confirmado_em  timestamptz;
