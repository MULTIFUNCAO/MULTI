-- Rode este script no SQL Editor do painel do Supabase (Project > SQL Editor > New query).
--
-- "usuarios" nunca teve migration própria no repo (criada direto no painel), então
-- não havia garantia de índice em "email" apesar de ser a coluna mais usada em
-- lookups no app (.eq("email", ...) / .in("email", [...]) em dezenas de pontos de
-- App.jsx). Mesma lógica dos índices adicionados em "pedidos"
-- (supabase_pedidos_migration.sql item 4): parte da hipótese de falta de índice
-- como causa do consumo de Disk IO Budget reportado no Security Advisor.

create index if not exists idx_usuarios_email on usuarios (email);
