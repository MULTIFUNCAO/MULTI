-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Suporta os 3 perfis de empresa parceira (reestruturação do "Preciso de
-- funcionário"): Empresa Básica (só prestadora), Empresa Pro (antiga "Plus",
-- presta serviço E contrata) e Empresa Contratante (só contrata, grátis, sem
-- assinatura — mesmo padrão do Cliente, que também não paga pra publicar
-- pedido).

alter table empresas
  add column if not exists tipo_conta text;

-- Backfill das empresas já cadastradas: deriva o tipo_conta da assinatura
-- ativa/trial mais recente (empresa_plus -> "pro", "empresa" -> "basica").
-- Quem nunca teve assinatura (trial expirado, nunca assinou) cai em "basica"
-- — preserva o comportamento de hoje, onde toda empresa cai na tela padrão
-- de prestadora e as features Plus são só bloqueadas por botão/paywall.
update empresas e
set tipo_conta = coalesce(
  (
    select case when a.plano = 'empresa_plus' then 'pro' else 'basica' end
    from assinaturas a
    where a.titular_tipo = 'empresa'
      and a.titular_email = e.email
      and a.status in ('trial', 'ativa')
    order by a.expira_em desc nulls last
    limit 1
  ),
  'basica'
)
where tipo_conta is null;

alter table empresas alter column tipo_conta set default 'basica';
alter table empresas alter column tipo_conta set not null;

alter table empresas drop constraint if exists empresas_tipo_conta_check;
alter table empresas add constraint empresas_tipo_conta_check
  check (tipo_conta in ('basica', 'pro', 'contratante'));
