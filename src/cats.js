// ───────────────────────── STATIC DATA ─────────────────────────────────────
// Extraído de App.jsx (2026-09-02) pra ficar importável também pelo
// AdminDashboard.jsx (seletor de categoria do formulário MULTI-SUP) sem
// criar import circular (App.jsx já importa AdminDashboard). Conteúdo/
// comentário histórico original preservado — só mudou de arquivo.
//
// Reformulação 2026-08-07: voltamos ao modelo de lista plana e específica
// (revertendo a ideia de "19 grupos contam pro plano + item é tag de busca"
// de um dia antes). Cada item de CATS (ex.: "Pedreiro", "Encanador") é a
// categoria de verdade — é o que o cliente escolhe ao publicar um pedido e o
// que o profissional escolhe no perfil. O campo `grupo` é só metadado visual
// (usado pra organizar o modal "Ver todas as categorias" e o seletor em 2
// passos do perfil/publicação em seções) — não muda a coluna categoria_servico,
// que continua text[] sem nenhuma migration nova necessária.
//
// Nova lista de categorias 2026-08-09: substitui os 19 grupos/265 itens
// antigos por 23 grupos/157 profissões distintas (165 entradas — 8 profissões
// aparecem listadas em 2 grupos de propósito, ver abaixo). O limite de plano
// não é mais um teto flat de itens: agora é grupos×profissões-por-grupo
// (ver PLANO_LIMITES_USUARIO). Itens que fazem sentido em mais de um grupo
// (ex.: "Fotógrafo" em Festas e Eventos e em Fotografia e Vídeo) foram
// mantidos com o MESMO id nos dois — descobrível pelos dois caminhos de
// navegação, sem contar em dobro no limite do plano, já que é o mesmo id
// entrando uma única vez em categoria_servico. Lista completa dos 8 ids
// cross-listados: carpinteiro (Reformas e Construção + Móveis/Marcenaria/
// Montagem), garcom/barman/churrasqueiro/cozinheiro (Festas e Eventos +
// Alimentação), fotografo/videomaker (Festas e Eventos + Fotografia e
// Vídeo), editor_de_video (Marketing e Serviços Digitais + Fotografia e
// Vídeo). Qualquer componente que faça `CATS.filter(c => value.includes(c.id))`
// pra montar chips de "selecionados" precisa deduplicar por id — um id
// cross-listado aparece 2x em CATS e geraria chip duplicado sem isso.
export const CATS = [
  // ── Reformas e Construção ──
  { id:"pedreiro", label:"Pedreiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"ajudante_de_pedreiro", label:"Ajudante de Pedreiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"mestre_de_obras", label:"Mestre de Obras", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"pintor", label:"Pintor", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"gesseiro", label:"Gesseiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"serralheiro", label:"Serralheiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"soldador", label:"Soldador", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"vidraceiro", label:"Vidraceiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"carpinteiro", label:"Carpinteiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"telhadista", label:"Telhadista", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"calheiro", label:"Calheiro", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"impermeabilizador", label:"Impermeabilizador", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"marmorista", label:"Marmorista", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"instalador_de_pisos", label:"Instalador de Pisos", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  { id:"instalador_de_drywall", label:"Instalador de Drywall", emoji:"🧱", star:4.7, bg:"#FFF0EE", dot:"#E53935", grupo:"Reformas e Construção" },
  // ── Elétrica e Automação ──
  { id:"eletricista", label:"Eletricista", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  { id:"eletricista_industrial", label:"Eletricista Industrial", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  { id:"tecnico_em_automacao", label:"Técnico em Automação", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  { id:"instalador_de_energia_solar", label:"Instalador de Energia Solar", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  { id:"instalador_de_carregador_para_veiculos_eletricos", label:"Instalador de Carregador para Veículos Elétricos", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  { id:"tecnico_de_seguranca_eletronica", label:"Técnico de Segurança Eletrônica", emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825", grupo:"Elétrica e Automação" },
  // ── Hidráulica e Desentupimento ──
  { id:"encanador", label:"Encanador", emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3", grupo:"Hidráulica e Desentupimento" },
  { id:"desentupidor", label:"Desentupidor", emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3", grupo:"Hidráulica e Desentupimento" },
  { id:"tecnico_de_caca_vazamento", label:"Técnico de Caça-Vazamento", emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3", grupo:"Hidráulica e Desentupimento" },
  { id:"hidrojatista", label:"Hidrojatista", emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3", grupo:"Hidráulica e Desentupimento" },
  { id:"tecnico_de_bombas", label:"Técnico de Bombas", emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3", grupo:"Hidráulica e Desentupimento" },
  // ── Gás e Fogão ──
  { id:"conserto_de_fogao", label:"Conserto de Fogão em Geral", emoji:"🔥", star:4.6, bg:"#FFF3E0", dot:"#EF6C00", grupo:"Gás e Fogão" },
  { id:"conversao_de_gas", label:"Conversão de Gás GN e GLP", emoji:"🔥", star:4.6, bg:"#FFF3E0", dot:"#EF6C00", grupo:"Gás e Fogão" },
  { id:"vazamento_de_gas", label:"Vazamento de Gás", emoji:"🔥", star:4.6, bg:"#FFF3E0", dot:"#EF6C00", grupo:"Gás e Fogão" },
  { id:"manutencao_de_fogoes", label:"Manutenção de Fogões", emoji:"🔥", star:4.6, bg:"#FFF3E0", dot:"#EF6C00", grupo:"Gás e Fogão" },
  // ── Móveis, Marcenaria e Montagem ──
  { id:"montador_de_moveis", label:"Montador de Móveis", emoji:"🪛", star:4.6, bg:"#FBE9E7", dot:"#BF360C", grupo:"Móveis, Marcenaria e Montagem" },
  { id:"marceneiro", label:"Marceneiro", emoji:"🪛", star:4.6, bg:"#FBE9E7", dot:"#BF360C", grupo:"Móveis, Marcenaria e Montagem" },
  { id:"carpinteiro", label:"Carpinteiro", emoji:"🪛", star:4.6, bg:"#FBE9E7", dot:"#BF360C", grupo:"Móveis, Marcenaria e Montagem" },
  { id:"restaurador_de_moveis", label:"Restaurador de Móveis", emoji:"🪛", star:4.6, bg:"#FBE9E7", dot:"#BF360C", grupo:"Móveis, Marcenaria e Montagem" },
  { id:"projetista_de_moveis", label:"Projetista de Móveis", emoji:"🪛", star:4.6, bg:"#FBE9E7", dot:"#BF360C", grupo:"Móveis, Marcenaria e Montagem" },
  // ── Limpeza e Higienização ──
  { id:"diarista", label:"Diarista", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"higienizador_de_estofados", label:"Higienizador de Estofados", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"limpador_de_vidros", label:"Limpador de Vidros", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"limpador_de_fachadas", label:"Limpador de Fachadas", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"limpador_de_caixa_d_agua", label:"Limpador de Caixa d'Água", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"piscineiro", label:"Piscineiro", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"profissional_de_limpeza_pos_obra", label:"Profissional de Limpeza Pós-Obra", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"profissional_de_limpeza_comercial", label:"Profissional de Limpeza Comercial", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  { id:"personal_organizer", label:"Personal Organizer", emoji:"🧹", star:4.7, bg:"#E0F2F1", dot:"#00796B", grupo:"Limpeza e Higienização" },
  // ── Climatização e Refrigeração ──
  { id:"tecnico_de_ar_condicionado", label:"Técnico de Ar-Condicionado", emoji:"❄️", star:4.7, bg:"#E1F5FE", dot:"#0277BD", grupo:"Climatização e Refrigeração" },
  { id:"tecnico_de_refrigeracao", label:"Técnico de Refrigeração", emoji:"❄️", star:4.7, bg:"#E1F5FE", dot:"#0277BD", grupo:"Climatização e Refrigeração" },
  // ── Técnica e Manutenção ──
  { id:"tecnico_de_eletrodomesticos", label:"Técnico de Eletrodomésticos", emoji:"💻", star:4.6, bg:"#E8EAF6", dot:"#303F9F", grupo:"Técnica e Manutenção" },
  { id:"tecnico_de_eletronicos", label:"Técnico de Eletrônicos", emoji:"💻", star:4.6, bg:"#E8EAF6", dot:"#303F9F", grupo:"Técnica e Manutenção" },
  { id:"tecnico_de_celulares", label:"Técnico de Celulares", emoji:"💻", star:4.6, bg:"#E8EAF6", dot:"#303F9F", grupo:"Técnica e Manutenção" },
  { id:"tecnico_de_informatica", label:"Técnico de Informática", emoji:"💻", star:4.6, bg:"#E8EAF6", dot:"#303F9F", grupo:"Técnica e Manutenção" },
  // ── Beleza ──
  { id:"cabeleireiro", label:"Cabeleireiro(a)", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"barbeiro", label:"Barbeiro", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"trancista", label:"Trancista", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"manicure", label:"Manicure", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"pedicure", label:"Pedicure", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"nail_designer", label:"Nail Designer", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"designer_de_sobrancelhas", label:"Designer de Sobrancelhas", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"lash_designer", label:"Lash Designer", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"maquiador", label:"Maquiador(a)", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"penteadista", label:"Penteadista", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"esteticista", label:"Esteticista", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"massoterapeuta", label:"Massoterapeuta", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"depilador", label:"Depilador(a)", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  { id:"micropigmentador", label:"Micropigmentador(a)", emoji:"💇", star:4.7, bg:"#FCE4EC", dot:"#AD1457", grupo:"Beleza" },
  // ── Instalações e Pequenos Reparos ──
  { id:"marido_de_aluguel", label:"Marido de Aluguel", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador", label:"Instalador", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador_de_tv", label:"Instalador de TV", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador_de_cortinas_e_persianas", label:"Instalador de Cortinas e Persianas", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador_de_redes_de_protecao", label:"Instalador de Redes de Proteção", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador_de_varais", label:"Instalador de Varais", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  { id:"instalador_de_prateleiras_e_suportes", label:"Instalador de Prateleiras e Suportes", emoji:"🔨", star:4.6, bg:"#FDECEA", dot:"#D84315", grupo:"Instalações e Pequenos Reparos" },
  // ── Chaveiro ──
  { id:"chaveiro", label:"Chaveiro", emoji:"🔑", star:4.6, bg:"#FFF8E1", dot:"#F9A825", grupo:"Chaveiro" },
  // ── Jardinagem e Áreas Externas ──
  { id:"jardineiro", label:"Jardineiro", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  { id:"paisagista", label:"Paisagista", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  { id:"podador", label:"Podador", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  { id:"rocador", label:"Roçador", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  { id:"cortador_de_grama", label:"Cortador de Grama", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  { id:"instalador_de_irrigacao", label:"Instalador de Irrigação", emoji:"🌿", star:4.8, bg:"#E8F8EE", dot:"#2E7D32", grupo:"Jardinagem e Áreas Externas" },
  // ── Automotivo ──
  { id:"mecanico", label:"Mecânico", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"eletricista_automotivo", label:"Eletricista Automotivo", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"funileiro", label:"Funileiro", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"pintor_automotivo", label:"Pintor Automotivo", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"martelinho_de_ouro", label:"Martelinho de Ouro", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"polidor", label:"Polidor", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"esteticista_automotivo", label:"Esteticista Automotivo", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"lavador_automotivo", label:"Lavador Automotivo", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"higienizador_automotivo", label:"Higienizador Automotivo", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"instalador_de_acessorios_automotivos", label:"Instalador de Acessórios Automotivos", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"borracheiro", label:"Borracheiro", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"guincheiro", label:"Guincheiro", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  { id:"mecanico_de_motos", label:"Mecânico de Motos", emoji:"🚗", star:4.6, bg:"#ECEFF1", dot:"#37474F", grupo:"Automotivo" },
  // ── Pets ──
  { id:"tosador", label:"Tosador", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"banhista", label:"Banhista", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"pet_sitter", label:"Pet Sitter", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"dog_walker", label:"Dog Walker", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"adestrador", label:"Adestrador", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"cuidador_de_pets", label:"Cuidador de Pets", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  { id:"pet_taxi", label:"Pet Taxi", emoji:"🐕", star:4.8, bg:"#FFF3E0", dot:"#E65100", grupo:"Pets" },
  // ── Estofaria, Reparos e Artesanato ──
  { id:"estofador", label:"Estofador", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  { id:"tapeceiro", label:"Tapeceiro", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  { id:"sapateiro", label:"Sapateiro", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  { id:"restaurador", label:"Restaurador", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  { id:"artesao", label:"Artesão", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  { id:"customizador", label:"Customizador", emoji:"🪡", star:4.5, bg:"#EFEBE9", dot:"#6D4C41", grupo:"Estofaria, Reparos e Artesanato" },
  // ── Festas e Eventos ──
  { id:"decorador", label:"Decorador", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"montador_de_eventos", label:"Montador de Eventos", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"garcom", label:"Garçom", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"barman", label:"Barman", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"churrasqueiro", label:"Churrasqueiro", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"cozinheiro", label:"Cozinheiro(a)", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"dj", label:"DJ", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"fotografo", label:"Fotógrafo", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"videomaker", label:"Videomaker", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"cerimonialista", label:"Cerimonialista", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"recreador", label:"Recreador", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"animador", label:"Animador", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"recepcionista_de_eventos", label:"Recepcionista de Eventos", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  { id:"seguranca_de_eventos", label:"Segurança de Eventos", emoji:"🎉", star:4.7, bg:"#F3E5F5", dot:"#8E24AA", grupo:"Festas e Eventos" },
  // ── Alimentação ──
  { id:"cozinheiro", label:"Cozinheiro(a)", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"chef_particular", label:"Chef Particular", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"churrasqueiro", label:"Churrasqueiro", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"confeiteiro", label:"Confeiteiro(a)", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"padeiro", label:"Padeiro", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"salgadeiro", label:"Salgadeiro(a)", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"sushiman", label:"Sushiman", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"garcom", label:"Garçom", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  { id:"barman", label:"Barman", emoji:"🍽️", star:4.7, bg:"#FFEBEE", dot:"#C62828", grupo:"Alimentação" },
  // ── Transporte e Mudanças ──
  { id:"freteiro", label:"Freteiro", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"motorista_de_mudanca", label:"Motorista de Mudança", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"ajudante_de_mudanca", label:"Ajudante de Mudança", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"carregador", label:"Carregador", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"motoboy", label:"Motoboy", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"entregador", label:"Entregador", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"motorista_particular", label:"Motorista Particular", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  { id:"transportador", label:"Transportador", emoji:"📦", star:4.6, bg:"#FFF3E0", dot:"#F57C00", grupo:"Transporte e Mudanças" },
  // ── Marketing e Serviços Digitais ──
  { id:"social_media", label:"Social Media", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"designer_grafico", label:"Designer Gráfico", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"gestor_de_trafego", label:"Gestor de Tráfego", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"copywriter", label:"Copywriter", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"editor_de_video", label:"Editor de Vídeo", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"web_designer", label:"Web Designer", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"desenvolvedor", label:"Desenvolvedor", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"criador_de_conteudo", label:"Criador de Conteúdo", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  { id:"fotografo_de_produtos", label:"Fotógrafo de Produtos", emoji:"🎯", star:4.6, bg:"#EDE7F6", dot:"#5E35B1", grupo:"Marketing e Serviços Digitais" },
  // ── Educação e Aulas ──
  { id:"professor_particular", label:"Professor Particular", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"professor_de_idiomas", label:"Professor de Idiomas", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"professor_de_musica", label:"Professor de Música", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"professor_de_informatica", label:"Professor de Informática", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"professor_de_reforco_escolar", label:"Professor de Reforço Escolar", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"tutor", label:"Tutor", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  { id:"instrutor", label:"Instrutor", emoji:"📚", star:4.7, bg:"#F1F8E9", dot:"#558B2F", grupo:"Educação e Aulas" },
  // ── Fotografia e Vídeo ──
  { id:"fotografo", label:"Fotógrafo", emoji:"📷", star:4.7, bg:"#E3F2FD", dot:"#1565C0", grupo:"Fotografia e Vídeo" },
  { id:"videomaker", label:"Videomaker", emoji:"📷", star:4.7, bg:"#E3F2FD", dot:"#1565C0", grupo:"Fotografia e Vídeo" },
  { id:"cinegrafista", label:"Cinegrafista", emoji:"📷", star:4.7, bg:"#E3F2FD", dot:"#1565C0", grupo:"Fotografia e Vídeo" },
  { id:"editor_de_video", label:"Editor de Vídeo", emoji:"📷", star:4.7, bg:"#E3F2FD", dot:"#1565C0", grupo:"Fotografia e Vídeo" },
  { id:"editor_de_fotos", label:"Editor de Fotos", emoji:"📷", star:4.7, bg:"#E3F2FD", dot:"#1565C0", grupo:"Fotografia e Vídeo" },
  // ── Engenharia, Projetos e Segurança do Trabalho ──
  { id:"engenheiro", label:"Engenheiro", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"arquiteto", label:"Arquiteto", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"tecnico_em_edificacoes", label:"Técnico em Edificações", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"projetista", label:"Projetista", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"topografo", label:"Topógrafo", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"tecnico_em_seguranca_do_trabalho", label:"Técnico em Segurança do Trabalho", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"engenheiro_de_seguranca_do_trabalho", label:"Engenheiro de Segurança do Trabalho", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  { id:"consultor_de_seguranca_do_trabalho", label:"Consultor de Segurança do Trabalho", emoji:"📐", star:4.7, bg:"#FFECB3", dot:"#F57F17", grupo:"Engenharia, Projetos e Segurança do Trabalho" },
  // ── Controle de Pragas ──
  { id:"controlador_de_pragas", label:"Controlador de Pragas", emoji:"🐜", star:4.5, bg:"#EFEBE9", dot:"#5D4037", grupo:"Controle de Pragas" },
  // ── Segurança e Controle de Acesso ──
  { id:"seguranca", label:"Segurança", emoji:"🛡️", star:4.6, bg:"#E8EAF6", dot:"#283593", grupo:"Segurança e Controle de Acesso" },
  { id:"vigilante", label:"Vigilante", emoji:"🛡️", star:4.6, bg:"#E8EAF6", dot:"#283593", grupo:"Segurança e Controle de Acesso" },
  { id:"controlador_de_acesso", label:"Controlador de Acesso", emoji:"🛡️", star:4.6, bg:"#E8EAF6", dot:"#283593", grupo:"Segurança e Controle de Acesso" },
  { id:"porteiro", label:"Porteiro", emoji:"🛡️", star:4.6, bg:"#E8EAF6", dot:"#283593", grupo:"Segurança e Controle de Acesso" },
];
