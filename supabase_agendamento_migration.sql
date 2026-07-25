-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da Fase 3 (agendamento + lembretes automáticos):
-- data/hora combinada do serviço, definida junto do aceite formal (Fase 2) no
-- chat, e o controle de idempotência dos lembretes automáticos (cron roda de
-- hora em hora — sem essas colunas, mandaria o mesmo lembrete várias vezes).
-- Este script é idempotente.

alter table pedidos add column if not exists data_agendada timestamptz;
alter table pedidos add column if not exists lembrete_vespera_enviado_em timestamptz;
alter table pedidos add column if not exists lembrete_dia_enviado_em timestamptz;
alter table pedidos add column if not exists lembrete_pos_enviado_em timestamptz;
