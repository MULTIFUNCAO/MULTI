-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 4 do fluxo de chat: adiciona "confirmado" ao enum de status de pedidos.
-- Setado automaticamente quando os dois lados confirmam o serviço no chat
-- (data/horário combinados + Termo de Isenção de Responsabilidade aceito por
-- ambos, via botão "Confirmar Serviço"). Fica entre "em_andamento" (ainda
-- negociando) e "executando" (profissional já iniciou o serviço). Este
-- script é idempotente.

alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('aberto','em_andamento','confirmado','executando','concluido','em_disputa','cancelado'));
