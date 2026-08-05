-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Apaga DE VEZ os 126 pedidos de teste que foram marcados como "cancelado"
-- na limpeza pré-lançamento de 2026-08-04 (mensagem original: "Apagar os
-- pedidos sujos de teste"), junto com o que ainda depende deles
-- (mensagens, chat_propostas_valor, aceites_termo).
--
-- As 41 linhas de "propostas" ligadas a esses pedidos já foram apagadas
-- antes (a RLS da chave anon permitiu DELETE nessa tabela), por isso esse
-- passo não está mais aqui.
--
-- Os 126 pedidos são identificados por cancelado_motivo = 'Limpeza de dados
-- de teste antes do lancamento' (setado por mim ao marcá-los como cancelado
-- em vez de já apagar direto). Isso evita ter que colar 126 UUIDs na mão.
--
-- Os 2 pedidos "apresentáveis" mantidos ativos (eletricista R$350, pedreiro
-- R$200) e o pedido do +contratante (pintor R$800, deixado de fora da
-- limpeza) NÃO têm esse motivo, então não são afetados.
--
-- 1) Rode o SELECT abaixo primeiro e confira que dá 126 antes de continuar.

select count(*) as total_a_apagar
from pedidos
where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento';

-- 2) Sem BEGIN/COMMIT dessa vez — o SQL Editor do Supabase roda cada
--    statement em autocommit, e o BEGIN/COMMIT explícito da versão anterior
--    aparentemente não persistiu (rodou a select de conferência dentro da
--    transação, mostrou 0, mas o commit não pegou). Assim cada delete abaixo
--    já commita sozinho ao rodar.

delete from mensagens
where pedido_id in (
  select id from pedidos
  where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento'
);

delete from chat_propostas_valor
where pedido_id in (
  select id from pedidos
  where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento'
);

delete from aceites_termo
where pedido_id in (
  select id from pedidos
  where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento'
);

delete from pedidos
where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento';

-- 3) Confira o resultado — precisa dar 0 agora, sem mais nenhum passo.

select count(*) as sobrou
from pedidos
where cancelado_motivo = 'Limpeza de dados de teste antes do lancamento';
