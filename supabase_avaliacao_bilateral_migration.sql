-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Documenta e versiona o schema da Fase 4 (avaliação bilateral): hoje
-- "avaliacoes" só suporta cliente avaliando profissional (colunas cliente_id/
-- profissional_id/profissional_nome fixas). Generaliza pra qualquer direção
-- (cliente avalia profissional/empresa E profissional/empresa avalia cliente)
-- via colunas genéricas, mantendo as antigas pra não quebrar a leitura já
-- existente em BancoProfissionaisScreen (filtra por profissional_id). Este
-- script é idempotente.

alter table avaliacoes add column if not exists avaliador_email text;
alter table avaliacoes add column if not exists avaliado_email text;
alter table avaliacoes add column if not exists avaliado_nome text;

-- Um avaliador só pode avaliar um pedido uma vez (mesmo padrão de propostas:
-- unique por pedido_id + quem age).
alter table avaliacoes drop constraint if exists avaliacoes_pedido_avaliador_key;
alter table avaliacoes add constraint avaliacoes_pedido_avaliador_key
  unique (pedido_id, avaliador_email);
