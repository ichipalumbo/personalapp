# Referência — Identidade, OAuth e verificação Google

> **Finalidade**: preservar o aprendizado técnico e regulatório da pesquisa de preparação para verificação Google, antes do planejamento de mudanças.
> **Consulta**: 2026-10-14 · **Fontes**: políticas, documentação técnica e ajuda oficiais do Google; benchmarks identificados separadamente.
> **Vigência**: reconferir políticas, classificação de escopos, interface do Console e requisitos de revisão antes de implementar ou submeter. Não é garantia de aprovação nem parecer jurídico.

## 1. Autoridade e uso desta referência

- A [spec de identidade](../specs/identidade-e-apresentacao-publica.md) registra as decisões
  aprovadas do produto. Esta referência não aprova logo, domínio, texto legal ou OAuth.
- O [diagnóstico datado](../diagnostics/2026-10-14-diag-identidade-verificacao-google.md)
  registra o que foi observado no código e o que não foi verificado externamente.
- As políticas oficiais são a autoridade dos requisitos Google. Guias e páginas de
  ajuda explicam o processo; exemplos de código não justificam pedir acesso excessivo.
- Não copiar o conteúdo inteiro para a spec de GCal nem manter aqui um segundo backlog.
  Configuração operacional efetivamente adotada pertence ao manual; sequência e provas
  de uma futura intervenção pertencem ao plano da frente.

## 2. Quatro verificações diferentes

| Dimensão | O que significa | O que não comprova |
|---|---|---|
| Autenticação | Google identifica a conta; o backend valida o ID token | Permissão para ler/escrever Calendar ou isolamento correto de todas as rotas |
| Autorização OAuth | A conta consente com escopos; tokens permitem acessar APIs | Aprovação da marca, ausência de vulnerabilidade ou autorização entre usuários do app |
| Verificação de marca, `Branding` | Identidade, domínio e apresentação pública são revisados | Aprovação de escopos sensíveis ou restritos |
| Verificação de acesso, `Data Access` | Necessidade e uso das permissões são revisados | Certificação geral de segurança, conformidade LGPD ou endosso comercial do Google |

`openid`, `email` e `profile` são permissões básicas de identidade, não acesso ao
Calendar. O ID token e o access token têm finalidades diferentes; um não substitui o
outro. A autorização de Calendar pode continuar após o fechamento do app se houver
acesso offline e refresh token válido no servidor. [G01, G03, G10, G11]

Uma PWA continua sendo uma aplicação web para esse fluxo. Verificação OAuth não é
publicação na Google Play, avaliação de ficha de segurança de dados da loja nem
verificação do Google Fit; essas integrações/publicações não decorrem do nome fitness.

## 3. Marca, apresentação e domínio

### 3.1 Identidade verdadeira e consistente

- Uma marca pessoal pode ser utilizada. O Google não exige remover o nome da professora
  nem alterar a paleta do aplicativo.
- Nome, logo quando utilizado, página pública, privacidade e consentimento devem
  identificar o mesmo produto. Descritor ajuda a compreensão, mas não deve criar nomes
  contraditórios entre os pontos de contato.
- Informar suporte e contatos de desenvolvimento válidos; manter responsáveis com acesso
  ao projeto atualizados para receber pedidos de esclarecimento e avisos de política.
- Não incorporar a marca Google à marca do app nem sugerir patrocínio, parceria ou
  certificação que não existam. Integração é uma capacidade técnica, não endosso. [G01–G04]

### 3.2 Página pública e documentos legais

Para aplicação externa em produção, a apresentação precisa ser acessível sem login,
explicar sua função e disponibilizar privacidade e termos. Um formulário de login,
Facebook ou ficha da Play Store, isoladamente, não substitui a página do produto.

A política de privacidade deve estar no domínio da página pública, ser facilmente
encontrada no site/app e usar a mesma URL no consentimento. Explicar o acesso a Google
em contexto, antes de solicitar a permissão, não somente em um documento difícil de achar.

**Ressalva entre fontes**: alguns guias mencionam termos como opcionais; a política OAuth
exige links de termos e privacidade para apps em produção, e a ajuda atual de Branding
também os exige para apps externos em produção. Não adotar o trecho mais permissivo de
um exemplo para dispensar termos no objetivo público deste projeto. [G01–G04, G15]

Não há arquitetura aprovada para uma landing page separada, nem exigência de framework,
bundler, ferramenta de consentimento ou redesign completo. O requisito é de conteúdo,
acessibilidade pública e identidade, não de stack.

### 3.3 Controle do domínio não se presume

- Verificar os domínios associados à página pública, privacidade, termos e credenciais
  OAuth usando Search Console, com conta proprietária da propriedade associada ao
  projeto Google Cloud como Owner ou Editor.
- `Authorized domains` utiliza o domínio privado relevante sobre o sufixo público; não
  confundir essa lista com `Authorized JavaScript origins` ou `Authorized redirect URIs`.
- O hostname da API não é automaticamente uma origem/redirect OAuth só por servir API.
  Conferir os endereços efetivamente associados ao consentimento e aos clientes.
- Uma tag HTML ou arquivo de verificação servido é um mecanismo de comprovação, não
  evidência de que a conta certa concluiu a verificação.
- Domínio próprio é recomendado para controle e reconhecimento da marca, especialmente
  em hospedagem com domínio compartilhado. Continuar na Vercel é compatível com essa
  recomendação; não é preciso trocar o provedor.
- Não afirmar que todo subdomínio `vercel.app` está aprovado ou proibido. Conferir o
  domínio privado aceito, a propriedade específica e o resultado do Console. [G02, G15]

### 3.4 Assets e botão Google

O SDK GIS é a opção recomendada para renderizar o botão de login segundo as diretrizes.
Existem assets oficiais e variantes clara, neutra e escura, inclusive botões compactos
somente com ícone. Um botão compacto oficial não deve ser confundido com um `G` solto
ou um ícone recriado.

O símbolo deve ser o `G` oficial colorido, nas proporções e espaçamentos previstos;
Font Awesome, versão monocromática ou símbolo recolorido não são substitutos. Há
possibilidade de aparência escura sem recolorir a interface inteira. Texto pode ser
localizado, como `Entrar com Google`, preservando o sentido de entrar no app com a conta
Google. Não confundir botão de login com ação de conectar Calendar. [G05]

Para o logo do aplicativo no consentimento, a ajuda informa JPG, PNG ou BMP, no máximo
1 MB; recomenda imagem quadrada de 120×120 para melhor exibição. Essa recomendação não
substitui os tamanhos de ícones do manifest PWA. O desenho continua decisão do dono. [G03]

## 4. Permissões: mínimo necessário, não mínimo número de telas

| Escopo | Capacidade relevante | Limite da alternativa |
|---|---|---|
| `calendar` | Gerenciar inclusive calendários e compartilhamento | É mais amplo que apenas trabalhar com eventos |
| `calendar.events.owned` | Ler, criar, alterar e excluir eventos em calendários da própria conta | Candidato para uso de `primary`; validar todos os métodos e casos do app |
| `calendar.events` | Ler e editar eventos nos calendários acessíveis | Avaliar somente se o uso real requer alcance além dos calendários próprios |
| `calendar.events.readonly` | Consultar eventos | Não permite publicar/alterar/excluir aulas |
| `calendar.freebusy` ou `calendar.events.freebusy` | Consultar disponibilidade | Não fornece todas as funções de detalhes e escrita de eventos |
| `calendar.app.created` | Criar calendários secundários e operar eventos neles | Não substitui leitura/escrita no `primary` já utilizado sem mudar o produto |

Os URIs completos têm prefixo `https://www.googleapis.com/auth/`. As alternativas são
material de avaliação, não decisão de troca. `owned` se refere à propriedade do
**calendário**, não à autoria de cada evento. O filtro de eventos próprios do app continua
necessário mesmo com esse escopo. [G06, G12]

A classificação atual de cada URI é apresentada em `Data Access`. Menor alcance não
garante ausência de verificação; ler dados privados do Calendar é exemplo de acesso
sensível nos guias. Não solicitar acesso por funcionalidades futuras ainda inexistentes.

Conferir permissões por endpoint: listagem, leitura, criação, edição, exclusão,
instâncias e `events.watch`. O webhook não exige, por si só, o escopo amplo `calendar`:
a referência de `events.watch` aceita `calendar.events` e `calendar.events.owned`.
Isso não comprova sozinho que toda a integração funciona com uma alternativa. [G01, G07, G12]

O pedido no código, os escopos declarados/aprovados no Console e os grants efetivamente
recebidos devem corresponder. `include_granted_scopes` pode incorporar autorizações
anteriores; reduzir a string solicitada não prova que o token passou a ter menor alcance.
A mudança exige considerar grants antigos e consequências de revogação, sem invalidar
conexões de usuários por iniciativa não autorizada. [G01, G09, G10]

## 5. Consentimento, segurança e ciclo dos dados

### 5.1 Autenticação e vínculo com a conta

- Validar ID token no backend com biblioteca apropriada, incluindo assinatura, `aud`,
  `iss` e `exp`. Decodificar JWT no browser não é verificação de autenticidade.
- O usuário autenticado determina a autorização no app. Email recebido em body/query,
  `hint`, `login_hint` ou seleção de conta no popup não substitui essa autorização.
- CORS não autentica nem isola usuários; um header enviado pelo frontend só protege se
  o backend exigir e validar o contrato correspondente.
- O Google recomenda `sub` como identificador estável da conta, pois email pode mudar.
  Isso é consideração para desenho de identidade, não autorização para trocar a chave
  `ownerEmail` deste repositório sem contrato e migração próprios. [G01, G10, G11]

### 5.2 Modelo de código GIS

No popup do modelo GIS, o guia atual utiliza a origem da página como `redirect_uri` na
troca do código. No redirect, exige URI cadastrada correspondente. O modelo popup orienta
validar cabeçalho customizado, como `X-Requested-With: XmlHttpRequest`, e origem; no
redirect, validar o `state` vinculado à solicitação. Não transplantar uma técnica sem
conferir o modelo efetivamente utilizado. [G10]

A referência de `CodeClient` documenta `requestCode()` sem overrides; `login_hint` pertence
à configuração do cliente. Parâmetros de `requestAccessToken`/`TokenClient` e do endpoint
OAuth não devem ser presumidos como parâmetros de `requestCode`. Uma divergência estática
precisa de verificação do fluxo real para concluir o efeito. [G09]

Solicitar Calendar quando a pessoa escolhe a função que precisa dele, com explicação
de finalidade. Tratar cancelamento, negativa, permissões parciais e expiração sem declarar
conexão válida apenas porque houve resposta. O app deve verificar os grants recebidos e
desabilitar somente as capacidades não autorizadas. [G01, G09, G10]

### 5.3 Credenciais, tokens e desconexão

- OAuth Client ID usado no browser não é client secret. Não registrar secrets, códigos
  de autorização, tokens reais ou chaves de criptografia em documentação, logs ou chat.
- Proteger credenciais e tokens em trânsito e em repouso; avaliar acesso ao banco,
  storage do browser, scripts, backups, logs e rotação de chaves. Existência de criptografia
  em um campo não certifica o sistema inteiro. [G01, G04]
- `Sair da conta`, desconectar Calendar, revogar consentimento e excluir conta/dados são
  ações distintas. A apresentação deve explicar o efeito real de cada uma.
- Revogar os tokens quando o acesso deixa de ser necessário e depois eliminá-los do
  sistema. Não confundir apagar um documento no MongoDB com revogação no Google.
- Revogação de grant combinado pode afetar escopos e clientes do mesmo projeto; considerar
  o impacto antes de especificar a desconexão. [G01, G09, G10]
- Encerrar um canal `events.watch` é operação de ciclo de vida do webhook, não substituto
  da revogação OAuth. Não afirmar que a revisão Google resolveu expiração/renovação.

### 5.4 Privacidade, Limited Use e LGPD

Documentar quais dados de Google são acessados, usados, armazenados, compartilhados e
eliminados, e por quê. Incluir identidade da conta, dados de eventos, derivados como
bloqueios, dados de alunos enviados ao Calendar, caches e logs pertinentes, e prestadores
que efetivamente processam esses dados. [G04]

Limited Use restringe uso a capacidades visíveis e apropriadas, transferências e leitura
humana, com exceções específicas. Não vender/transferir esses dados para publicidade,
retargeting ou avaliação de crédito. Permissões de API não autorizam novo uso secundário;
mudanças de finalidade exigem transparência e consentimento conforme a política.

Não declarar que dados permanecem somente no aparelho, que nunca passam por terceiros ou
que desaparecem imediatamente se o funcionamento real não sustentar isso. Retenção,
exclusão em backups, acesso de suporte e responsabilidades precisam de decisão verificável.
Uma frase de conformidade não substitui as práticas e os controles correspondentes.

Adequação LGPD e disponibilidade jurídica da marca são avaliações independentes da
verificação OAuth. Não inventar responsável legal, CNPJ, endereço, prazo de retenção ou
compromisso de exclusão. Revisão jurídica não foi executada nesta pesquisa.

## 6. Ambiente, limites e três prazos de sete dias

| Mecanismo | Significado | Não confundir com |
|---|---|---|
| OAuth em `Testing` | Até 100 test users; autorizações e refresh tokens expiram após sete dias para o cenário com Calendar | TTL de access token/ID token ou renovação do webhook |
| Limite de app não verificado | Em regra, 100 novos usuários no total para grants de escopos não aprovados; o contador é vitalício do projeto | Lista de test users ou cota mensal da API |
| Publicação da marca aprovada | Resultado de Branding precisa ser publicado em até sete dias, segundo a ajuda atual | Expiração semanal de marca já publicada |
| Canal `events.watch` | TTL padrão de 604800 segundos, com expiração/renovação próprias | Validade do consentimento Google |

A exceção de sete dias para autorização em `Testing` corresponde a pedidos limitados
às permissões básicas de identidade (`openid`, email e profile); não resolve o cenário
com Calendar. `In Production` muda o público/modo, mas não aprova marca ou escopos. Tokens
de produção também podem ser revogados ou expirar por outros motivos. [G08, G10, G12, G16]

Uso pessoal conhecido, desenvolvimento/teste, uso interno de organização e dados próprios
de service account possuem regras/exceções específicas. Marca pessoal, aplicativo gratuito
ou pequeno número inicial de usuários não tornam automaticamente um lançamento público
isento. Administradores Google Workspace podem bloquear uma integração já verificada. [G01, G07]

As políticas exigem projetos separados para níveis de desenvolvimento/teste e produção.
Isso não significa que o repositório já possua staging, nem autoriza criar ambiente
paralelo nesta rodada. Conferir os clientes, origins e redirects existentes antes de
descrever conformidade; clientes de produção não devem conter origens restritas ao teste.
Produção exige HTTPS e navegador seguro; localhost possui exceções para desenvolvimento,
não para substituir as páginas públicas de revisão. [G01, G10, G15]

## 7. Evidências e processo de revisão

O Google Auth Platform separa `Branding`, `Audience`, `Clients`, `Data Access` e
`Verification Center`. A configuração efetiva só pode ser confirmada no projeto correto;
não se deduz do código, da URL Vercel nem de uma tag de Search Console.

No processo atual, alterações de nome, logo ou URLs ficam em `Draft Branding`. A revisão
automática pode terminar em minutos; revisão manual é indicada como tipicamente 2–3 dias
úteis. Depois da aprovação, publicar a marca dentro da janela informada. A marca publicada
é pré-condição para pedir verificação de acesso no fluxo atual. [G02, G03]

Para escopos sensíveis, apresentar justificativa por escopo e explicar por que acesso
menor não atende à função real. O vídeo deve mostrar ponta a ponta o login quando usado,
consentimento, nome correto, OAuth Client ID na barra de endereço e uso de cada permissão.
Hospedar como vídeo não listado no YouTube e mostrar o consentimento em inglês. O app
pode continuar em português; não foi definida tradução da interface. [G07, G14]

Para este tipo de produto, uma demonstração pertinente inclui publicação de aula no
Calendar e leitura de compromisso externo como bloqueio. É exemplo de evidência, não
roteiro de execução autorizado. Mock prova apenas o comportamento simulado e não pode
ser apresentado como comprovação de OAuth, token, webhook ou chamada real ao Google.

Mudança somente de marca pode exigir nova verificação de marca sem nova justificativa
de escopos inalterados e sem gerar, por si, o aviso de escopos não verificados. Adicionar
escopos não aprovados à versão pública pode gerar aviso e limite de usuários. Separar
as duas operações em vez de pressupor que trocar o nome reinicia tudo. [G13]

Revisão de escopos sensíveis é indicada como tipicamente 3–5 dias úteis; esclarecimentos
e reenvios podem alongar o processo. Não tratar números como SLA ou data de lançamento.
Escopos restritos com dados acessados por servidores podem exigir avaliação CASA e
recertificação anual. Isso não é consequência automática de integrar Calendar ou MongoDB.
Nenhum orçamento de auditoria, custo de domínio ou prazo contratado foi apurado. [G07, G17]

## 8. Aprendizado de mercado e nomes — apoio, não contrato

| Fonte oficial do produto | Foco apresentado | Aprendizado útil |
|---|---|---|
| [MFIT Personal](https://www.mfitpersonal.com.br/) | Prescrição, acompanhamento de alunos e pagamentos | Falar da rotina e carreira do profissional |
| [Tecnofit Personal](https://www.tecnofit.com.br/solucoes-tecnofit-personal/) | Treinos, alunos e controle de mensalidades | Identificar público e funções de forma concreta |
| [My PT Hub](https://www.mypthub.net/features/calendar-features/) | Sessões, agendamento, gestão e pagamentos | Agenda operacional é eixo de apresentação pertinente |
| [ABC Trainerize](https://www.trainerize.com/) | Coaching, treinos, nutrição, sessões e negócio | Consistência entre produto, identidade e apresentação pública |

São materiais dos próprios fornecedores, consultados na pesquisa de 2026-10-14; não são
benchmark de preços, experiência de uso, cobertura jurídica ou comprovação da aprovação
Google deles. Não afirmar que todos implementam o mesmo contrato deste app: publicação
de aulas no Google e importação de eventos externos como bloqueios, com fontes de verdade
distintas, não sincronização de edições nos dois sentidos sobre o mesmo evento.

O posicionamento identificado para este app é organização operacional: agenda, alunos,
reposições e controle financeiro. Não anunciar prescrição completa de treinos, IA,
pagamentos integrados ou portal de aluno só porque concorrentes oferecem essas funções.

As opções independentes foram exploratórias. A decisão da marca pertence à spec, não
a ranking de sugestões. Registro de marca, disponibilidade de domínio e resultados de
lojas/redes de **Personal Josy** não foram verificados. Ausência em busca web não significa
nome livre; nome parecido não comprova impedimento jurídico.

## 9. Fontes oficiais e assuntos cobertos

Todas as fontes abaixo foram consultadas nesta conversa em 2026-10-14. Conteúdo das páginas
é evolutivo; os links não constituem uma cópia congelada de política nem substituem
reconferência antes da submissão.

| ID | Fonte | Assunto |
|---|---|---|
| G01 | [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies) | Requisitos de produção, escopos, identidade, segurança, revogação e projetos separados |
| G02 | [Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) | Marca, domínios, processo e exceções |
| G03 | [Manage OAuth App Branding](https://support.google.com/cloud/answer/15549049?hl=en) | Logo, URLs, contatos e versões de marca |
| G04 | [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) | Transparência, finalidade, segurança e Limited Use |
| G05 | [Sign in with Google Branding Guidelines](https://developers.google.com/identity/branding-guidelines) | SDK, assets, cores, espaçamentos e variantes do botão |
| G06 | [Choose Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth) | Capacidades de cada escopo Calendar |
| G07 | [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) | Necessidade, justificativa, vídeo, prazos típicos e exceções |
| G08 | [Manage App Audience](https://support.google.com/cloud/answer/15549945?hl=en) | Público, Testing/produção e limite vitalício de usuários |
| G09 | [Google Account Authorization JavaScript API](https://developers.google.com/identity/oauth2/web/reference/js-reference) | CodeClient, parâmetros, grants e revogação |
| G10 | [Use Code Model](https://developers.google.com/identity/oauth2/web/guides/use-code-model) e [OAuth for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) | Popup/redirect, CSRF, tokens e ciclo de autorização |
| G11 | [Verify the Google ID token on your server side](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) | Verificação JWT e identificador `sub` |
| G12 | [Events: watch](https://developers.google.com/workspace/calendar/api/v3/reference/events/watch), [Events: insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) e [Channels: stop](https://developers.google.com/workspace/calendar/api/v3/reference/channels/stop) | Exemplos de escopos mínimos e ciclo do webhook |
| G13 | [Changes to approved app](https://support.google.com/cloud/answer/13464018?hl=en) | Rebranding versus alteração de escopos e nova verificação |
| G14 | [Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en) | Página, privacidade, domínio, vídeo e acesso mínimo |
| G15 | [Comply with OAuth 2.0 policies](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance) | Aplicação dos requisitos à publicação e domínio próprio recomendado |
| G16 | [OAuth 2.0 — refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration) e [Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en) | Expiração em Testing, avisos e limite de usuários |
| G17 | [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) e [Security Assessment](https://support.google.com/cloud/answer/13465431?hl=en) | Avaliação adicional e recertificação para escopos restritos |

## 10. Limites desta referência

Não houve acesso ao projeto privado Google Cloud, Search Console, configuração Vercel,
banco, credenciais ou logs de produção. Não houve submissão, gravação de vídeo, teste
OAuth real, auditoria de segurança completa nem análise jurídica. A pesquisa não é uma
promessa de exaustividade de todas as regras de todos os produtos Google.

Nomes de telas do Console, prazos típicos e classes de escopo precisam ser reconferidos.
Quando uma fonte retornar apenas trecho, redirecionar para widget ou estiver inacessível,
não completar a lacuna com suposição. As diretrizes completas do botão foram consultadas
no navegador durante a pesquisa inicial; o extrator redirecionou para um configurador.

Antes de planejar, distinguir decisão do dono, requisito externo, fato no código,
hipótese de impacto e configuração remota ainda desconhecida. Esta referência preserva
o aprendizado; não executa nem autoriza as intervenções sugeridas por ele.