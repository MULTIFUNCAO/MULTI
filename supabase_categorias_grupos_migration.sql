-- ⛔ OBSOLETO (2026-08-07) — NÃO RODAR.
-- O modelo "19 grupos contam pro plano + item é tag de busca em
-- usuarios.especialidades" descrito abaixo foi revertido no dia seguinte:
-- CATS voltou a ser a lista plana e específica de sempre (ver App.jsx),
-- sem coluna `especialidades` nova nenhuma. Este script nunca terminou de
-- rodar de qualquer forma — ficou bloqueado pelo bug de plataforma "coluna
-- some sozinha da API REST" (mesmo bug do ticket de suporte aberto pra
-- doc_rg_status etc.). Mantido só como registro histórico da tentativa.
--
-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Reformulação de categorias (2026-08-06/07): as antigas 46 categorias
-- planas viraram 19 grupos (Reformas e Construção, Instalação e Montagem,
-- ..., Tecnologia e Redes — ver CATS em App.jsx). Os ids antigos (ex.:
-- "pedreiro", "encanador") deixaram de ser categorias válidas — agora são
-- "especialidades" (tags de busca/filtro que NÃO contam pro limite do
-- plano) dentro do grupo novo correspondente.
--
-- Este script:
--   1) cria a coluna usuarios.especialidades (text[])
--   2) migra usuarios.categoria_servico existente: cada id antigo vira o
--      grupo novo correspondente em categoria_servico, e o rótulo antigo
--      é preservado como item em especialidades — assim ninguém perde a
--      seleção que já tinha feito, só muda de formato.
--
-- ⚠️ Este projeto Supabase já teve histórico de colunas/RLS/CHECK/triggers
-- revertendo sozinhos depois de confirmados (ver memória "Supabase
-- multifuncao project" e o caso de 2026-08-06 com doc_rg_status etc.). Se
-- depois de rodar isso a coluna ou os dados não aparecerem mais, não rode
-- este script de novo por cima — confirme antes com
-- `select column_name from information_schema.columns where table_name='usuarios'`
-- e, se a coluna sumir de novo, é sintoma do mesmo bug de plataforma, abra
-- ticket com a Supabase em vez de repetir o script.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Nova coluna
-- ─────────────────────────────────────────────────────────────────────────
alter table usuarios
  add column if not exists especialidades text[] not null default '{}';

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Migração de dados — mapa dos 46 ids antigos pro grupo novo, com o
--    rótulo antigo preservado como especialidade.
-- ─────────────────────────────────────────────────────────────────────────
with mapa(old_id, novo_grupo, old_label) as (
  values
    ('pedreiro','reformas_construcao','Pedreiro'),
    ('encanador','hidraulica_desentupimento','Encanador'),
    ('jardineiro','jardinagem_piscinas','Jardineiro'),
    ('eletricista','reformas_construcao','Eletricista'),
    ('pintor','reformas_construcao','Pintor'),
    ('vidraceiro','reformas_construcao','Vidraceiro'),
    ('chaveiro','chaveiro','Chaveiro 24h'),
    ('desentupidor','hidraulica_desentupimento','Desentupimento'),
    ('redes','instalacao_montagem','Redes de Proteção'),
    ('lavanderia','assistencia_tecnica','Téc. Máq. de Lavar'),
    ('tv','instalacao_montagem','Instal. TV/Suporte'),
    ('montador','instalacao_montagem','Montador de Móveis'),
    ('estofados','limpeza_especializada','Higien. Estofados'),
    ('eletrodomesticos','assistencia_tecnica','Assistência Técnica de Eletrodomésticos'),
    ('baba','servicos_domesticos','Babá'),
    ('costureira','servicos_domesticos','Costureira'),
    ('cozinheira','servicos_domesticos','Cozinheira'),
    ('cuidador_idosos','servicos_domesticos','Cuidador(a) de Idosos'),
    ('decoracao_festas','festas_eventos','Decoração de Festas'),
    ('dedetizacao','controle_pragas','Dedetização / Controle de Pragas'),
    ('drywall','reformas_construcao','Drywall / Gesseiro'),
    ('estrutura_metalica','reformas_construcao','Estrutura Metálica'),
    ('faxineira','limpeza_especializada','Faxineira / Diarista'),
    ('mudanca','transporte_mudancas','Frete e Mudança'),
    ('gesso','reformas_construcao','Gesso / Sanca'),
    ('guincho','automotivo','Guincho / Reboque'),
    ('impermeabilizacao','reformas_construcao','Impermeabilização'),
    ('informatica','assistencia_tecnica','Informática / Suporte Técnico'),
    ('ar_condicionado','climatizacao','Instalador de Ar-Condicionado'),
    ('cameras_alarmes','eletrica_seguranca_eletronica','Instalador de Câmeras / Alarmes / Cerca Elétrica'),
    ('papel_parede','instalacao_montagem','Instalador de Papel de Parede / Insulfilm'),
    ('paisagismo','jardinagem_piscinas','Jardinagem / Paisagismo'),
    ('lavagem_fachada','limpeza_especializada','Lavagem de Fachada / Telhado'),
    ('caixa_dagua','hidraulica_desentupimento','Limpeza de Caixa d''Água / Calhas'),
    ('pos_obra','limpeza_especializada','Limpeza Pós-Obra'),
    ('marcenaria','reformas_construcao','Marcenaria'),
    ('motorista','transporte_mudancas','Motorista / Frete'),
    ('passadeira','servicos_domesticos','Passadeira'),
    ('personal_organizer','servicos_domesticos','Personal Organizer'),
    ('pet_sitter','servicos_pets','Pet Sitter / Dog Walker'),
    ('piscineiro','jardinagem_piscinas','Piscineiro'),
    ('faztudo','instalacao_montagem','Reparos Gerais / Faz-tudo'),
    ('sapateiro','servicos_domesticos','Sapateiro'),
    ('seguranca','seguranca','Segurança / Vigia'),
    ('teladista','reformas_construcao','Teladista / Calheiro'),
    ('toldos','instalacao_montagem','Toldos e Coberturas')
),
expandido as (
  select u.email, m.novo_grupo, m.old_label
  from usuarios u
  cross join lateral unnest(u.categoria_servico) as antigo(old_id)
  join mapa m on m.old_id = antigo.old_id
  where u.categoria_servico is not null and array_length(u.categoria_servico, 1) > 0
),
agregado as (
  select email,
         array_agg(distinct novo_grupo) as novas_categorias,
         array_agg(distinct old_label)  as novas_especialidades
  from expandido
  group by email
)
update usuarios u
set categoria_servico = a.novas_categorias,
    especialidades    = (
      select array_agg(distinct x) from unnest(coalesce(u.especialidades, '{}') || a.novas_especialidades) as x
    )
from agregado a
where u.email = a.email;
