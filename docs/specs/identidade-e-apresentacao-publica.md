# Spec — Identidade e apresentação pública

> **Status**: Aprovada, não implementada · **Versão**: 7 · **Atualizado**: 2026-10-16
> **Escopo aprovado**: nome, descritor, identidade visual definida no guia v3 (símbolo calendário com J, assinatura e composições do kit), paleta funcional do aplicativo preservada, personalidade profissional e acolhedora, Poppins principal/Montserrat alternativa, endereço atual e contato provisório de suporte.
> **Fonte da identidade visual**: [guia de identidade visual v3](../reference/identidade/guia-identidade-visual-v3.md), com os arquivos do [kit visual completo v2](../reference/identidade/kit-visual-completo-v2/LEIA-ME.md). O [PDF do guia v3](../reference/identidade/guia-identidade-visual-v3.pdf) é a versão visual do mesmo conteúdo; em divergência, prevalece o `.md`.
> **Limite**: identidade e arquivos de marca aprovados; aplicação no app não executada. Os pesos da marca não homologam pesos/tamanhos da interface; textos legais, autenticação e execução do rebranding continuam fora desta aprovação.

## 1. Objetivo e fronteira

Identificar o aplicativo como **Personal Josy**, preservando a identidade pessoal da
professora e a paleta existente. A apresentação pública deve permitir compreender o
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

- Preservar a paleta atual do aplicativo, incluindo identidade, categorias e estados.
- O rebranding não autoriza recolorir a interface nem alterar o significado das cores.
- Assets do Google obedecem à identidade do próprio Google; preservação da paleta do app
  não é autorização para recolorir o símbolo oficial ou criar um logo Google próprio.
- A escolha da variante e da apresentação do botão Google permanece pendente; não há
  aprovação de uma exceção de cor nem de alterações concretas no botão nesta spec.

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
  `#E0E0E0`. A atualização dos arquivos da marca não recolore a interface; preservar sua
  paleta funcional.

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

- **Poppins** é a família principal da identidade e a direção aprovada para futura adoção
  em toda a interface do app, preservando as fontes próprias de ícones/assets de terceiros.
- **Montserrat** é a alternativa; não combinar as duas famílias por padrão nem tratar
  a alternativa como troca métrica automática de Poppins.
- A assinatura do nome usa Poppins SemiBold 600 e o descritor, Poppins Regular 400,
  ambos já convertidos em vetores nos arquivos do kit; não substituir esses caminhos
  por texto dependente de fonte nem refazê-los com outra família ou peso.
- A fonte atual do app não muda nesta aprovação documental. Pesos, tamanhos, fallback,
  arquivos/carregamento e impacto de layout devem ser definidos e validados antes da adoção.

### 2.9 Aplicação no cabeçalho

Decisão aprovada:

- Usar a composição **horizontal escura transparente, sem descritor**, no canto superior
  esquerdo, aplicada como arquivo, não como texto.
- Substituir a identificação **Prô Josy** por **Personal Josy**.
- Não usar descritor, sombra, contorno ou animação no header.
- Preservar a proporção e manter espaço para os controles existentes.

A simulação do header foi aprovada só como referência visual. Tamanho no app, leitura no
viewport de referência, comportamento em larguras menores e nome acessível ainda precisam
ser validados na implementação. Se a horizontal deixar de funcionar em alguma largura,
a adaptação precisa de aprovação; não trocar silenciosamente pela escrita ou pelo
símbolo isolado.

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

Referências a `Prô Josy` em documentos históricos continuam descrevendo a identidade da
época. O novo nome não autoriza reescrever históricos nem apresentar a mudança como já
publicada. Nomes ainda presentes no produto serão tratados na implementação futura.

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
| Adoção da fonte na interface | Carregamento, fallback, pesos e regressões de layout a validar; ainda não implementada |
| Ícones de instalação, favicon e asset para consentimento Google | Fora da entrega do guia v3; composição, dimensões e leitura a decidir a partir do kit |
| Página pública e localização dos links legais no app | A definir; sem arquitetura, URL ou layout aprovados |
| Verificação do endereço atual e das URLs no Google | Conferir Search Console e projeto OAuth; manter o endereço não comprova aprovação |
| Responsável legal, privacidade, retenção e exclusão | A confirmar com o dono; o contato provisório de suporte não encerra essas definições |
| Escopos, revogação, sessão, proteção OAuth e correções de isolamento | Exigem contrato e autorização específicos; esta decisão de marca não os aprova |
| Data de lançamento, submissão Google e coordenação da publicação | A decidir; não inferir do nome aprovado |

## 5. Fora de escopo

- Implementar o rebranding, planejar cartões/ordem de execução ou publicar o aplicativo.
- Redesenhar a identidade aprovada no guia v3, reintroduzir monogramas ou o logotipo quadrado anterior, ou criar páginas legais definitivas sem decisão explícita.
- Alterar cores, navegação, regras financeiras, recorrência ou conflitos.
- Alterar autenticação, sincronização, tokens, webhooks ou estado remoto.
- Comprar domínio, mudar infraestrutura, criar projetos/clientes Google ou submeter revisão.
- Afirmar disponibilidade jurídica da marca, conformidade LGPD ou aprovação Google.
- Reescrever documentos históricos ou tratar recomendações como decisões aprovadas.

O planejamento de implementação é posterior à consolidação das evidências e à confirmação
das decisões pendentes. Esta aprovação documental não significa mudança de produto,
aceite da interface, deploy ou autorização para modificar áreas sensíveis. O aceite dos
arquivos do kit não equivale ao aceite de sua futura aplicação no app.