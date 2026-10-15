# Spec — Identidade e apresentação pública

> **Status**: Aprovada, não implementada · **Versão**: 2 · **Atualizado**: 2026-10-14
> **Escopo aprovado**: nome Personal Josy, descritor, monograma PJ entrelaçado preenchido, preservação da paleta da interface, manutenção do endereço atual e contato provisório de suporte.
> **Limite**: a aprovação do símbolo não aplica a marca ao app nem aprova tipografia, textos legais, desenho de autenticação ou execução do rebranding.

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

### 2.4 Monograma aprovado

O símbolo escolhido é o **PJ entrelaçado preenchido**, conforme o
[SVG aprovado](../reference/identidade/pj-entrelacado-preenchido.svg):

- **P** branco (`#ffffff`) com contorno preto (`#000000`).
- **J** preenchido em amarelo/dourado (`#ffd700`) com contorno preto (`#000000`).
- Fundo escuro (`#0d0d0d`) e proporções/entrelaçamento do arquivo escolhido preservados.
- Versão estática, **sem ondas, tremor ou animação**.

A escolha é do símbolo desse SVG. As versões lado a lado, com J vazado ou com ondas
foram descartadas e não compõem a identidade selecionada.

Tipografia da assinatura `Personal Josy`, composição do cabeçalho, adaptações para
instalação PWA e asset de consentimento Google ainda precisam ser definidas. Aprovar o
monograma não significa aprovar essas aplicações ou exportações anteriores.

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

## 4. Propostas e decisões ainda abertas

| Assunto | Situação |
|---|---|
| Tipografia e composição do cabeçalho | A definir usando o monograma aprovado; não redesenhar o símbolo por inferência |
| Ícones de instalação e asset para consentimento Google | Adaptações, dimensões e enquadramento a definir a partir do monograma aprovado |
| Página pública e localização dos links legais no app | A definir; sem arquitetura, URL ou layout aprovados |
| Verificação do endereço atual e das URLs no Google | Conferir Search Console e projeto OAuth; manter o endereço não comprova aprovação |
| Responsável legal, privacidade, retenção e exclusão | A confirmar com o dono; o contato provisório de suporte não encerra essas definições |
| Escopos, revogação, sessão, proteção OAuth e correções de isolamento | Exigem contrato e autorização específicos; esta decisão de marca não os aprova |
| Data de lançamento, submissão Google e coordenação da publicação | A decidir; não inferir do nome aprovado |

## 5. Fora de escopo

- Implementar o rebranding, planejar cartões/ordem de execução ou publicar o aplicativo.
- Redesenhar o símbolo aprovado ou criar páginas legais definitivas sem decisão explícita.
- Alterar cores, navegação, regras financeiras, recorrência ou conflitos.
- Alterar autenticação, sincronização, tokens, webhooks ou estado remoto.
- Comprar domínio, mudar infraestrutura, criar projetos/clientes Google ou submeter revisão.
- Afirmar disponibilidade jurídica da marca, conformidade LGPD ou aprovação Google.
- Reescrever documentos históricos ou tratar recomendações como decisões aprovadas.

O planejamento de implementação é posterior à consolidação das evidências e à confirmação
das decisões pendentes. Esta aprovação documental não significa mudança de produto,
aceite da interface, deploy ou autorização para modificar áreas sensíveis. O aceite do
símbolo em SVG não equivale ao aceite de sua futura aplicação no app.