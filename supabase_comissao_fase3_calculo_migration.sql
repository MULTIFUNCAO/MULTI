-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 3 do modelo de comissão (ver memória do projeto
-- multi_modelo_comissao_pagamento_intermediado — o plano de 10 fases
-- original em .claude/plans/enchanted-mixing-sunrise.md foi perdido, não
-- existe mais no disco): cálculo automático de pedidos.valor_comissao/
-- valor_repasse pra pedidos com modelo_pagamento='intermediado'.
-- Comissão fixa de 15% sobre pedidos.valor. Idempotente (create or
-- replace function + drop/create trigger).
--
-- Escopo confirmado com o usuário (2026-08-26): só o cálculo, roda no
-- INSERT do pedido — não recalcula em UPDATE de pedidos.valor durante a
-- negociação (achado da memória: "aceite" tem 2 transições, o valor ainda
-- pode mudar antes da confirmação formal). Se um pedido for criado sem
-- valor definido (negociação começa depois), valor_comissao/valor_repasse
-- ficam null até alguém rodar um recálculo manual — isso é uma lacuna
-- conhecida, não resolvida nesta migration, fica registrada aqui de
-- propósito pra não ser esquecida.
--
-- Não conflita com trg_lock_campos_repasse (Fase 1, supabase_comissao_
-- fundacao_migration.sql): aquele trigger só roda em BEFORE UPDATE e
-- reverte valor_comissao/valor_repasse se quem mudou não for service_role.
-- Este trigger aqui roda em BEFORE INSERT, timing diferente, sem
-- interseção — uma sessão anon/authenticated criando o pedido consegue
-- disparar o cálculo normalmente, e o valor calculado já nasce protegido
-- pelo lock da Fase 1 contra alteração posterior por quem não for
-- service_role.
--
-- IMPORTANTE (bug conhecido deste projeto Supabase): DDL já reverteu
-- sozinho depois de "confirmado" outras vezes neste projeto. Rode o teste
-- de sanidade no fim, espere alguns minutos, e rode de novo (reler via
-- REST/anon key ou nova query) antes de considerar concluído.

create or replace function pedidos_calcula_comissao_intermediado()
returns trigger as $$
begin
  if new.modelo_pagamento = 'intermediado' and new.valor is not null then
    new.valor_comissao := round(new.valor * 0.15, 2);
    new.valor_repasse := new.valor - new.valor_comissao;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calcula_comissao_intermediado on pedidos;
create trigger trg_calcula_comissao_intermediado
  before insert on pedidos
  for each row execute function pedidos_calcula_comissao_intermediado();

-- ─── Confirme que existe (rode agora e de novo depois de alguns minutos) ──
select tgname from pg_trigger where tgname = 'trg_calcula_comissao_intermediado';

-- Teste funcional opcional, sem gravar nada de verdade (rollback no fim):
-- confirma que a função calcula certo pra um caso conhecido (valor 100 ->
-- comissão 15, repasse 85) sem precisar de um pedido real com FKs válidas.
select
  round(100 * 0.15, 2) as valor_comissao_esperado,
  100 - round(100 * 0.15, 2) as valor_repasse_esperado;
