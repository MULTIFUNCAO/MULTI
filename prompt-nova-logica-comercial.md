Preciso implementar uma reformulação grande do modelo comercial do Multi. Antes de codar, quero que você monte um plano em fases (essa mudança toca planos, fluxo de solicitação do cliente, chat, e painel admin — não quero tudo de uma vez sem revisão). Aqui está a especificação completa:

## 1. Planos do profissional — limite por QUANTIDADE, não por valor

Remover completamente o limite de faturamento mensal (R$600 no Autônomo, R$3.000 no Pro). O novo modelo:

- **Multi Autônomo — R$29,90**: 1 categoria/profissão; até 3 serviços aceitos/mês; atende só Residencial; valor máximo de R$5.000 por serviço (não por mês).
- **Multi Pro — R$59,90**: até 3 categorias; até 10 serviços aceitos/mês; atende Residencial + Empresarial; mesmo teto de R$5.000 por serviço.
- **Multi Premium — R$129,90**: categorias e serviços ilimitados; Residencial + Empresarial; sem limite de valor.

O teto de R$5.000 por serviço precisa ser uma CONFIGURAÇÃO no banco/painel admin, não hardcoded — vamos querer ajustar isso no futuro sem mexer em código.

## 2. O que consome o limite

Oportunidade recebida, proposta enviada e conversa NÃO consomem o limite. Só o ACEITE/contratação dentro do Multi consome. Profissional pode ver e negociar quantas oportunidades quiser; o bloqueio só acontece ao tentar aceitar a que estouraria o limite.

Mensagens de upgrade específicas:
- Autônomo no limite (3): "Você atingiu o limite de 3 serviços do Multi Autônomo. Faça upgrade para o Multi Pro e continue aceitando novos serviços."
- Pro no limite (10): "Você atingiu o limite de 10 serviços do Multi Pro. Faça upgrade para o Multi Premium e aceite serviços sem limite."

## 3. Nova lógica de valor na solicitação do cliente

Não obrigar informar preço exato. Apenas DUAS opções (não três):

- **A) "A partir de quanto você pretende investir?"** — campo de valor de referência (ex: "A partir de R$500"). Precisa ficar visualmente claro que é referência, não obriga o profissional a aceitar aquele preço.
- **B) "Não sei quanto custa. Quero receber orçamentos e negociar com os profissionais."** — sem valor; cliente recebe propostas, compara, negocia, contrapropõe, aceita ou recusa. A negociação já está embutida nessa opção — não existe uma terceira opção separada de "negociar".

Campos do fluxo de criação da solicitação: descrição livre → categoria → tipo de solicitação (Residencial/Empresarial) → valor (A ou B) → fotos/vídeos opcionais → localização → data/período.

Importante: tipo de solicitação (Residencial/Empresarial) é sobre a NATUREZA da demanda, não sobre o tipo de cliente — um cliente pessoa física pode fazer uma solicitação Empresarial. É esse campo que determina o acesso do plano do profissional, não se o usuário é PF ou CNPJ.

## 4. Proteção de dados por estágio

- Antes do aceite: mostrar só localização aproximada/região (ex: "Jardim Maia — Guarulhos"), nunca o endereço completo.
- Depois do aceite: liberar o endereço completo necessário pra execução.
- Telefone/WhatsApp do cliente: mesma lógica, só libera pós-aceite. Toda comunicação pré-aceite passa pelo chat interno.

Fluxo: Solicitação → Propostas → Chat/Negociação → Aceite → Liberação dos dados → Execução.

## 5. Sistema antifuga do chat (feature nova)

Detectar tentativas de tirar a negociação da plataforma antes do aceite: telefone, WhatsApp, e-mail, Instagram/redes sociais, links externos, CPF/CNPJ, endereço completo, e frases como "me passa seu WhatsApp", "te chamo por fora", "não aceita pelo Multi", "vamos combinar direto".

**Abordagem técnica decidida: regex/heurística primeiro, não análise via LLM por mensagem.** Motivo: mais barato, sem latência extra no chat, e mais fácil de expor como regras configuráveis no painel admin. Só considerar uma camada de IA depois, se a heurística mostrar buracos reais.

Precisa analisar contexto, não só palavras isoladas — inclusive tentativas de dividir um número em várias mensagens (ex: "meu número é" / "11" / "99999" / "8888" em mensagens separadas, ou por extenso "onze nove oito..."). Sugestão de abordagem: manter uma janela curta de mensagens recentes por conversa (ex: últimas 5-10 mensagens em poucos minutos) e rodar a checagem de padrão de telefone/contato sobre a concatenação dessa janela, além de cada mensagem individual.

Ação escalonada:
- 1ª tentativa: bloqueia a mensagem, mostra aviso: "⚠️ Essa mensagem contém informações de contato ou pode direcionar a negociação para fora do Multi. Para sua segurança, continue a negociação pela plataforma."
- Reincidência: registra ocorrência, aplica restrição maior.
- Reincidência grave: alerta o painel admin; pode aplicar restrição temporária do chat, suspensão temporária, suspensão da conta ou banimento. Tudo registrado no histórico da conta.

## 6. Histórico de conformidade do profissional

Registrar por profissional: tentativas de compartilhar contato externo, tentativas de fuga da plataforma, ocorrências, bloqueios, suspensões, reclamações, cancelamentos, avaliações, serviços concluídos. Pensado como base pra um futuro índice de confiabilidade — não precisa implementar o índice agora, só garantir que os dados ficam registrados de forma que dê pra calcular isso depois.

## 7. Painel administrativo

Exibir e permitir controlar por profissional: plano, categoria(s), quantidade de serviços aceitos no mês, limite disponível, valor de cada serviço, tipo de demanda, quantidade de propostas/contratações, ocorrências de antifuga, bloqueios, suspensões, upgrades/downgrades.

Configurável pelo admin sem mexer em código: limite de categorias por plano, limite de serviços por plano, valor máximo por serviço (o teto de R$5.000), regras de bloqueio e de reincidência do antifuga.

---

## Como quero proceder

1. Primeiro, quero que você monte um plano em fases — o que dá pra fazer com segurança em cada etapa, dado que mexe em planos, RLS, chat e fluxo de solicitação (áreas que já tiveram bugs e o bug de durabilidade documentado nesse projeto).
2. Não comece a codar ainda — me mostra o plano de fases primeiro pra eu aprovar a ordem.
3. Lembra do padrão que já usamos: qualquer alteração de schema/RLS deve ser testada tabela por tabela, numa execução só, com reverificação via consulta direta depois (o bug de durabilidade desse projeto já causou retrabalho várias vezes).
