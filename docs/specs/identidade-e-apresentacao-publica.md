# Spec — Identidade e apresentação pública

> **Status**: Aprovada, não implementada · **Versão**: 5 · **Atualizado**: 2026-10-16
> **Escopo aprovado**: nome, descritor, logotipo Personal sobre Josy em Poppins Bold 700, prancheta quadrada com versões escura e transparente, paleta preservada, personalidade profissional e acolhedora, Poppins principal/Montserrat alternativa, endereço atual e contato provisório de suporte.
> **Limite**: logotipo e composição dos SVGs aprovados; aplicação no app não executada. O peso 700 é do logotipo, não homologação dos pesos/tamanhos da interface; textos legais, autenticação e execução do rebranding continuam fora desta aprovação.

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

### 2.4 Logotipo aprovado

O logotipo escolhido é o nome completo **Personal Josy**, em duas linhas de **Poppins
Bold 700** convertidas em caminhos vetoriais, centralizadas em uma prancheta quadrada.
Estão aprovadas duas versões do mesmo desenho:

- [SVG com fundo escuro](../reference/identidade/personal-josy-quadrado.svg), com base
  incorporada `#0d0d0d`.
- [SVG com fundo transparente](../reference/identidade/personal-josy-quadrado-transparente.svg),
  sem retângulo de fundo; os espaços internos das letras permanecem transparentes.

Nas duas versões:

- **Personal** branco (`#ffffff`), menor, na linha superior.
- **Josy** amarelo/dourado (`#ffd700`), maior, logo abaixo, com a mesma largura visual
  de Personal. Cada palavra é escalada proporcionalmente, sem esticar as letras.
- Prancheta `viewBox 0 0 256 256`, palavras com 200 unidades de largura, margens laterais
  de 28 unidades, intervalo vertical de 12 unidades e bloco centralizado.
- Sem contornos, sombras, ondas, tremor ou animação.
- Os SVGs compartilham caminhos, cores e posicionamento e abrem sem fonte instalada
  ou carregada externamente. A única diferença visual é o retângulo de fundo.

A escolha substitui os monogramas PJ anteriores, que foram descartados. Não recriar
as iniciais como símbolo oficial nem recompor o logotipo por digitação: a geometria e
a relação de escala entre as palavras são as dos arquivos aprovados.

A versão transparente serve para composições sobre fundo existente; a escura conserva
uma base uniforme. Isso não homologa cada aplicação em PWA, Google ou material externo.
Como o logotipo não tem contornos, fundo branco/claro pode comprometer Personal e Josy;
usar base escura apropriada e conferir a leitura, sem inverter cores ou acrescentar bordas.

A composição do arquivo foi aprovada. Tamanho e aplicação no cabeçalho, adaptações para
instalação PWA e asset de consentimento Google ainda precisam ser definidos e validados,
especialmente a leitura da palavra Personal em tamanhos pequenos.

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
- O logotipo aprovado deriva de Poppins Bold 700, já convertido em vetores; não substituir
  seus caminhos por texto dependente de fonte nem refazê-lo com outra família/peso.
- A fonte atual do app não muda nesta aprovação documental. Pesos, tamanhos, fallback,
  arquivos/carregamento e impacto de layout devem ser definidos e validados antes da adoção.

### 2.9 Direção da assinatura

A assinatura oficial é a composição de duas linhas da seção 2.4: **Personal** branco
acima de **Josy** amarelo, maior e com a mesma largura, em Poppins Bold 700. Não recebe
contorno, sombra ou efeito do cabeçalho anterior e não combina nome com monograma PJ.

O desenho dos SVGs está aprovado, mas aplicação no header, tamanho mínimo e desempenho
de leitura em cada suporte ainda precisam de validação. Uma versão horizontal, com cores
invertidas ou com outras proporções exige proposta e aprovação próprias.

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
preferiu o nome completo. A composição com Personal acima e Josy maior abaixo dá destaque
à professora sem depender das iniciais. Isso é decisão de reconhecimento da marca,
não exigência de remover monogramas para obter aprovação Google.

Os monogramas anteriores não são versões reduzidas oficiais deste logotipo. Se o nome
completo perder leitura em um ícone pequeno, avaliar uma aplicação específica; não
reintroduzir `PJ`, remover Personal ou alterar as palavras por inferência.

## 4. Propostas e decisões ainda abertas

| Assunto | Situação |
|---|---|
| Aplicação e dimensões no cabeçalho | A validar usando o logotipo de duas linhas aprovado; não recompor a marca por inferência |
| Adoção da fonte na interface | Carregamento, fallback, pesos e regressões de layout a validar; ainda não implementada |
| Ícones de instalação e asset para consentimento Google | Dimensões, enquadramento e leitura de Personal a validar a partir do logotipo aprovado |
| Página pública e localização dos links legais no app | A definir; sem arquitetura, URL ou layout aprovados |
| Verificação do endereço atual e das URLs no Google | Conferir Search Console e projeto OAuth; manter o endereço não comprova aprovação |
| Responsável legal, privacidade, retenção e exclusão | A confirmar com o dono; o contato provisório de suporte não encerra essas definições |
| Escopos, revogação, sessão, proteção OAuth e correções de isolamento | Exigem contrato e autorização específicos; esta decisão de marca não os aprova |
| Data de lançamento, submissão Google e coordenação da publicação | A decidir; não inferir do nome aprovado |

## 5. Fora de escopo

- Implementar o rebranding, planejar cartões/ordem de execução ou publicar o aplicativo.
- Redesenhar o logotipo aprovado, reintroduzir monogramas ou criar páginas legais definitivas sem decisão explícita.
- Alterar cores, navegação, regras financeiras, recorrência ou conflitos.
- Alterar autenticação, sincronização, tokens, webhooks ou estado remoto.
- Comprar domínio, mudar infraestrutura, criar projetos/clientes Google ou submeter revisão.
- Afirmar disponibilidade jurídica da marca, conformidade LGPD ou aprovação Google.
- Reescrever documentos históricos ou tratar recomendações como decisões aprovadas.

O planejamento de implementação é posterior à consolidação das evidências e à confirmação
das decisões pendentes. Esta aprovação documental não significa mudança de produto,
aceite da interface, deploy ou autorização para modificar áreas sensíveis. O aceite do
logotipo em SVG não equivale ao aceite de sua futura aplicação no app.