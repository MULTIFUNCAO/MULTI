-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Torna o fluxo "propor valor" simétrico: cliente também pode propor, não só
-- o profissional (ver supabase_chat_propostas_valor_migration.sql pra versão
-- original, profissional-only). Incremental — não mexe em nada do que já
-- existe na tabela, só adiciona.

-- Backfill automático: toda proposta que já existe hoje foi feita pelo
-- profissional (era a única opção até agora), então o default cobre as
-- linhas antigas na mesma instrução que cria a coluna.
alter table chat_propostas_valor add column if not exists proposto_por text not null default 'profissional';

alter table chat_propostas_valor drop constraint if exists chat_propostas_valor_proposto_por_check;
alter table chat_propostas_valor add constraint chat_propostas_valor_proposto_por_check
  check (proposto_por in ('cliente', 'profissional'));

-- Regra de negócio: só pode haver UMA proposta pendente por pedido por vez —
-- quem recebeu tem que aceitar/recusar antes de qualquer novo "Propor valor"
-- (dos dois lados). Índice único parcial (só enxerga linhas status='pendente')
-- garante isso no banco, não só na checagem da UI.
drop index if exists idx_chat_propostas_valor_unica_pendente;
create unique index idx_chat_propostas_valor_unica_pendente
  on chat_propostas_valor (pedido_id)
  where status = 'pendente';
