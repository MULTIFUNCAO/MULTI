-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- Fase 2 do fluxo de chat: anexos (foto/vídeo/arquivo) nas mensagens de
-- negociação. Script idempotente (add column if not exists).

-- "texto" continua not null (schema original em supabase_mensagens_migration.sql),
-- então uma mensagem só-anexo é enviada com texto = "" — sem precisar afrouxar
-- a constraint existente.
alter table mensagens add column if not exists anexo_url  text;
alter table mensagens add column if not exists anexo_tipo text; -- 'imagem' | 'video' | 'arquivo'
alter table mensagens add column if not exists anexo_nome text; -- nome original do arquivo, usado no card de 'arquivo'

alter table mensagens drop constraint if exists mensagens_anexo_tipo_check;
alter table mensagens add constraint mensagens_anexo_tipo_check
  check (anexo_tipo is null or anexo_tipo in ('imagem', 'video', 'arquivo'));

-- Upload usa o mesmo bucket "pedidos-fotos" já existente (fotos de conclusão,
-- logo de empresa, avatar) — bucket público, sem policy de mimetype no banco.
