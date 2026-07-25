-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Suporta a feature "Demanda de Mão de Obra": empresa Multi Empresa Plus posta
-- uma demanda (ex: "preciso de um eletricista pra uma obra") que só aparece
-- pra profissionais Multi Pro (não Multi Autônomo, já que Pro é o plano B2B).
-- Reaproveita a mesma tabela "pedidos" (fonte única já consolidada) em vez de
-- criar uma tabela paralela — a demanda é só um pedido cujo "cliente" é uma
-- empresa e que só aparece pro público certo.

alter table pedidos
  add column if not exists publico_alvo text not null default 'geral';

alter table pedidos drop constraint if exists pedidos_publico_alvo_check;
alter table pedidos add constraint pedidos_publico_alvo_check
  check (publico_alvo in ('geral', 'pro'));
