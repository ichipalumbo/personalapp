# Spec — Identidade e apresentação pública

> **Status**: Em implementação · **Versão**: 9 · **Atualizado**: 2026-10-22
> **Escopo aprovado**: nome, descritor, identidade visual definida no guia v3 (símbolo calendário com J, assinatura e composições do kit), adoção na interface das cores da marca e da paleta do produto do guia, personalidade profissional e acolhedora, Poppins principal/Montserrat alternativa com adoção da Poppins na interface por arquivos locais, aplicação no cabeçalho, nome no produto, ícones de instalação, endereço atual e contato provisório de suporte.
> **Fonte da identidade visual**: [guia de identidade visual v3](../reference/identidade/guia-identidade-visual-v3.md), com os arquivos do [kit visual completo v2](../reference/identidade/kit-visual-completo-v2/LEIA-ME.md). O [PDF do guia v3](../reference/identidade/guia-identidade-visual-v3.pdf) é a versão visual do mesmo conteúdo; em divergência, prevalece o `.md`.
> **Limite**: aplicação no app autorizada nos termos da seção 2 e **em execução** — o cabeçalho recebeu o logo e os alvos de toque do topo; nome no produto, ícones, cores e tipografia seguem pendentes no [plano](../plans/2026-10-17-plan-aplicacao-identidade-visual.md). Cada aplicação exige conferência no suporte final. Os pesos da marca não homologam pesos/tamanhos da interface; textos legais, consentimento Google, publicação e mudanças de autenticação além da seção 2.9 continuam fora desta aprovação.

## 1. Objetivo e fronteira

Identificar o aplicativo como **Personal Josy**, preservando a identidade pessoal da
professora e aplicando ao produto a identidade visual aprovada. A apresentação pública deve permitir compreender o
produto e sua integração com Google sem prometer funcionalidades ou aprovação que não
tenham sido comprovadas.

O objetivo de lançamento público informado pelo dono permanece como contexto da
preparação. O nome pessoal não torna o aplicativo tecnicamente exclusivo de uma conta
nem o transforma em aplicativo `Internal` do Google Workspace.

Esta é a fonte da decisão de marca, não uma especificação completa de publicação,
privacidade ou OAuth. Os contratos de [interface](interface-e-navegacao.md),
[sincronização com Google Calendar](gcal-sync.md),
[finanças](financas-ciclo-cobranca.md) e [reposições](reposicoes-e-competencia.md)
continuam independentes e não são redefinidos aqui.

**Autoridade sobre o visual.** Desenho, composições, cores da marca, tipografia da
assinatura, regras de uso e usos proibidos da identidade são definidos pelo
[guia de identidade visual v3](../reference/identidade/guia-identidade-visual-v3.md).
Esta spec registra as decisões de produto e remete ao guia, sem repetir suas regras
de desenho. O PDF do guia é apenas a versão visual do mesmo conteúdo. Uma alteração
de identidade exige atualizar o guia e o kit de forma coordenada; o que o guia marca
como recomendação ou pendência não vira decisão aprovada por estar citado aqui.

## 2. Decisões aprovadas

### 2.1 Nome e vínculo

- O nome oficial é **Personal Josy**, com essa grafia e um espaço entre as palavras.
- A marca mantém o nome da professora; não será substituída por uma marca independente.
- O nome não inclui `Prô`, um nome alternativo ou um descritor obrigatório como sufixo.
- O descritor aprovado é **Agenda e gestão para personal trainers.** Ele explica o produto,
  não integra o nome oficial nem precisa aparecer permanentemente no cabeçalho operacional.

### 2.2 Cores

- A interface adota as [cores da marca](../reference/identidade/guia-identidade-visual-v3.md#3-cores-da-marca)
  e a [paleta do produto](../reference/identidade/guia-identidade-visual-v3.md#14-paleta-do-produto)
  do guia v3.
- **Amarelo Josy `#FFDE17`** substitui o amarelo anterior `#FFD700` em toda a interface,
  inclusive nas variações com transparência, mantendo o papel de identidade e destaque.
- **Grafite `#202020`** substitui `#0D0D0D` como base escura da interface.
- Cores de categoria e estado mantêm o significado atual. A recoloração não cria, funde
  nem troca significados.
- Uma cor da interface sem correspondente direto na paleta do guia não é substituída por
  inferência: o mapeamento é decidido com o dono durante a implementação, e não se cria
  cor nova sem decisão.
- Os pares de texto e fundo resultantes cumprem o
  [contraste mínimo do guia](../reference/identidade/guia-identidade-visual-v3.md#10-legibilidade-e-contraste),
  conferido no suporte final.
- Assets do Google obedecem à identidade do próprio Google; a paleta do app não autoriza
  recolorir o símbolo oficial ou criar um logo Google próprio.
- A variante e a apresentação do botão Google continuam pendentes; não há exceção de cor
  aprovada. A única alteração autorizada no botão é a da seção 2.9.

### 2.3 Consistência de apresentação

Na implementação futura, a identidade apresentada no aplicativo, título da página,
instalação PWA, página pública, documentos legais e consentimento Google deve ser
reconhecível e consistente com **Personal Josy**. O nome do responsável legal e os contatos
devem corresponder às pessoas ou entidades efetivamente responsáveis, sem inferência a
partir do nome da marca.

A preparação para verificação Google deve representar a integração real. Não anunciar
endosso, parceria, certificação geral de segurança ou aprovação Google sem evidência
correspondente. Cumprir requisitos e submeter o aplicativo não garante aprovação.

### 2.4 Identidade visual aprovada

A identidade visual é a definida no
[guia de identidade visual v3](../reference/identidade/guia-identidade-visual-v3.md)
(seções 3 a 5 e 11), aplicada com os arquivos do
[kit visual completo v2](../reference/identidade/kit-visual-completo-v2/LEIA-ME.md). Em resumo,
sem substituir o guia:

- **Símbolo**: calendário amarelo com duas presilhas e **J preenchido em `#202020`
  opaco**, inclusive nos arquivos transparentes.
- **Aplicações**: sete composições aprovadas, com aplicação clara e escura; na clara,
  Personal, presilhas e descritor são escuros e Josy amarelo com contorno escuro; na
  escura, Personal e presilhas são brancos, Josy amarelo sem contorno e o descritor
  `#E0E0E0`.
- **Sete composições aprovadas**: horizontal, somente escrita, somente símbolo,
  empilhada, horizontal com descritor, empilhada com descritor e avatar, cada uma com
  aplicações clara e escura, em exportações transparentes ou com fundo incorporado.
- **Cores da marca**: amarelo `#FFDE17`, escuro `#202020`, branco `#FFFFFF` e cinza-claro
  `#E0E0E0`. A aplicação dessas cores na interface segue a seção 2.2.

Usar sempre os arquivos do kit como mestres. Não redesenhar, recompor por digitação nem
traçar a marca a partir de prévias ou capturas.

O calendário com J substitui o monograma PJ e o logotipo quadrado em duas linhas
(Personal sobre Josy, Poppins Bold 700) aprovado na versão 5 desta spec. Nenhum dos
dois é versão alternativa ou reduzida da marca atual; não reintroduzi-los.

A aprovação dos arquivos não homologa tamanho mínimo, comportamento responsivo,
acessibilidade nem uso em qualquer fundo. Cada aplicação no app, no PWA, no consentimento
Google ou em material externo precisa ser conferida no suporte final.

### 2.5 Endereço atual mantido

Manter por enquanto o endereço público atual,
[josy-personal-app.vercel.app](https://josy-personal-app.vercel.app/), sem contratar domínio
próprio nesta frente. A hospedagem e os identificadores técnicos existentes não serão
renomeados por causa da marca.

Essa escolha não comprova propriedade no Search Console nem aprovação do domínio ou
das URLs no projeto OAuth. Essas configurações continuam pendentes de conferência.

### 2.6 Contato provisório de suporte

O contato indicado pelo dono é **Luccas Palumbo**, pelo e-mail
[luccaspalumbo@gmail.com](mailto:luccaspalumbo@gmail.com), provisoriamente autorizado como
contato público de suporte na preparação do aplicativo.

Informar esse contato não define, por si, responsável legal, controlador/operador de
dados, encarregado de privacidade, canal formal de exclusão ou compromissos de retenção.
Essas definições continuam abertas e não devem ser preenchidas por inferência.

### 2.7 Personalidade visual

A direção de marca aprovada é **profissional e acolhedora**: preservar o vínculo pessoal,
comunicar organização e proximidade, sem depender de estética agressiva de musculação
ou efeitos metálicos de luxo. Essa direção orienta a apresentação, sem ampliar as
funcionalidades ou promessas do produto.

### 2.8 Direção tipográfica

- **Poppins** é a família principal da identidade e é adotada em toda a interface do app,
  preservando as fontes próprias de ícones/assets de terceiros.
- **Montserrat** é a alternativa; não combinar as duas famílias por padrão nem tratar
  a alternativa como troca métrica automática de Poppins.
- A assinatura do nome usa Poppins SemiBold 600 e o descritor, Poppins Regular 400,
  ambos já convertidos em vetores nos arquivos do kit; não substituir esses caminhos
  por texto dependente de fonte nem refazê-los com outra família ou peso.
- Na interface, a Poppins é carregada de arquivos locais servidos pelo próprio app, sem
  requisição a serviço de fontes de terceiros, e precisa continuar disponível offline no
  PWA. A licença da família acompanha os arquivos.
- Pesos, tamanhos, pilha de fallback e impacto de layout são definidos e validados na
  implementação, inclusive nos viewports menores; os pesos da marca não os homologam.

### 2.9 Aplicação no cabeçalho

Decisão aprovada:

- Usar a composição **horizontal escura transparente, sem descritor**, no canto superior
  esquerdo, aplicada como arquivo, não como texto.
- Substituir a identificação **Prô Josy** por **Personal Josy**.
- Não usar descritor, sombra, contorno ou animação no header.
- Preservar a proporção e manter espaço para os controles existentes.
- No botão de login Google do cabeçalho, apenas a área de toque pode ser ampliada, sem
  alterar variante, cores, texto, símbolo ou comportamento de autenticação. Por ser área
  de autenticação, a mudança é avisada ao dono antes de implementada.

A simulação do header foi aprovada só como referência visual. Tamanho no app, leitura no
viewport de referência, comportamento em larguras menores e nome acessível ainda precisam
ser validados na implementação. Se a horizontal deixar de funcionar em alguma largura,
a adaptação precisa de aprovação; não trocar silenciosamente pela escrita ou pelo
símbolo isolado.

### 2.10 Nome no produto e ícones de instalação

- Título da página, nome e nome curto do PWA e título de app da Apple passam a
  **Personal Josy**.
- Se o nome curto for truncado na tela inicial de alguma plataforma, a abreviação precisa
  de aprovação; a seção 2.1 não admite nome alternativo por inferência.
- Ícones de instalação, favicon e ícone da Apple seguem o
  [ícone do aplicativo no guia v3](../reference/identidade/guia-identidade-visual-v3.md#83-ícone-do-aplicativo),
  gerados a partir dos arquivos-mestre do kit, sem redesenho.
- Cor de tema e fundo da tela de abertura do PWA são definidos na implementação, após
  teste nas plataformas, e aprovados pelo dono.

## 3. Decisões e casos de borda

### 3.1 Por que manter uma marca pessoal

O dono informou que a professora deseja manter seu nome. A decisão preserva esse vínculo
e simplifica a identificação do aplicativo. Uma marca independente foi considerada,
mas não foi adotada; não deve reaparecer como opção padrão durante a implementação.

O Google exige identidade verdadeira e consistente, não uma marca impessoal nem uma
paleta específica para o aplicativo. O rebranding é decisão do produto, não requisito
de abandonar a marca da professora.

### 3.2 Nome comercial não é identificador técnico

Renomear a marca não autoriza renomear automaticamente repositório, projetos Vercel,
projeto Google Cloud, OAuth Client ID, banco, collections, campos, chaves de storage,
URLs ou identificadores de eventos.

O marcador `app_origin = corepersonal` identifica eventos do app no Google Calendar e
deve ser preservado no rebranding. Uma eventual migração desse marcador exigiria decisão
e contrato próprios de compatibilidade, não substituição textual pelo nome comercial.

O nome do cache do service worker contém `Prô Josy`, mas é identificador técnico, não
nome exibido. Não é renomeado por causa da marca: trocá-lo invalida o cache instalado e
exige decisão própria.

Referências a `Prô Josy` em documentos históricos continuam descrevendo a identidade da
época. O novo nome não autoriza reescrever históricos nem apresentar a mudança como já
publicada. Nomes exibidos ainda presentes no produto são substituídos na implementação,
conforme as seções 2.9 e 2.10.

### 3.3 Público e autorização não mudam com a marca

Manter `Josy` no nome não autoriza restringir o acesso apenas à professora nem ampliar
acesso entre contas. O isolamento autenticado por `ownerEmail` continua obrigatório.
Lançamento público não aprova portal de aluno, equipe, compartilhamento ou novos papéis.

### 3.4 Por que usar o nome por extenso

O dono identificou que `PJ` pode remeter a **Pessoa Jurídica** no contexto brasileiro e
preferiu não usar as iniciais. A assinatura mantém o nome completo, com Josy em destaque
de cor, e o símbolo usa apenas o J dentro do calendário. Isso é decisão de reconhecimento
da marca, não exigência de remover monogramas para obter aprovação Google.

Os monogramas anteriores e o logotipo quadrado da versão 5 não são versões reduzidas
oficiais da marca atual. Para espaços pequenos ou quadrados, usar as composições do kit
(símbolo ou avatar) e conferir a leitura no suporte; não reintroduzir `PJ`, remover
Personal da assinatura ou alterar as palavras por inferência.

## 4. Propostas e decisões ainda abertas

| Assunto | Situação |
|---|---|
| Aplicação e dimensões no cabeçalho | Composição decidida (seção 2.9); tamanho, leitura e larguras menores a validar |
| Adoção da fonte na interface | Adoção e carregamento local decididos (seção 2.8); pesos, tamanhos, fallback e regressões de layout a definir e validar |
| Cores da interface sem correspondente na paleta do guia | Mapeamento a decidir com o dono durante a implementação (seção 2.2) |
| Ícones de instalação e favicon | Regra decidida (seção 2.10); dimensões e leitura a validar no suporte final |
| Cor de tema e fundo de abertura do PWA | A definir na implementação após teste (seção 2.10) |
| Variante e apresentação do botão Google | Pendente; apenas a ampliação da área de toque está autorizada (seção 2.9) |
| Asset para a tela de consentimento Google | Fora desta implementação; composição, dimensões e leitura a decidir a partir do kit |
| Página pública e localização dos links legais no app | A definir; sem arquitetura, URL ou layout aprovados |
| Verificação do endereço atual e das URLs no Google | Conferir Search Console e projeto OAuth; manter o endereço não comprova aprovação |
| Responsável legal, privacidade, retenção e exclusão | A confirmar com o dono; o contato provisório de suporte não encerra essas definições |
| Escopos, revogação, sessão, proteção OAuth e correções de isolamento | Exigem contrato e autorização específicos; esta decisão de marca não os aprova |
| Data de lançamento, submissão Google e coordenação da publicação | A decidir; não inferir do nome aprovado |

## 5. Fora de escopo

- Publicar o aplicativo, definir data de lançamento ou submeter à verificação Google.
- Redesenhar a identidade aprovada no guia v3, reintroduzir monogramas ou o logotipo quadrado anterior, ou criar páginas legais definitivas sem decisão explícita.
- Alterar o significado das cores de categoria e estado, navegação, regras financeiras, recorrência ou conflitos.
- Alterar autenticação, sincronização, tokens, webhooks ou estado remoto, exceto a área de toque do botão Google prevista na seção 2.9.
- Comprar domínio, mudar infraestrutura, criar projetos/clientes Google ou submeter revisão.
- Afirmar disponibilidade jurídica da marca, conformidade LGPD ou aprovação Google.
- Reescrever documentos históricos ou tratar recomendações como decisões aprovadas.

A aplicação da identidade no app e no PWA está autorizada nos termos da seção 2. O aceite
dos arquivos do kit não equivale ao aceite de sua aplicação: cada aplicação precisa ser
conferida no suporte final, e esta spec não autoriza modificar áreas sensíveis além do
que está previsto nela.