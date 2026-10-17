# Diagnóstico — Identidade e preparação para verificação Google

> **Status**: Concluído no recorte estático/documental · **Criado/Atualizado**: 2026-10-14
> **Pergunta**: quais divergências e informações faltantes precisam ser conhecidas antes de planejar o rebranding e a preparação Google?
> **Base**: `46a89124bd4c35f51646cb8712aa7149fe6288ca` · **Branch**: `docs/auditoria-roadmap` · working tree limpo no início desta rodada documental.
> **Método**: pesquisa oficial na conversa e releitura dirigida de código/documentação; sem execução de OAuth, consultas ao banco, chamadas de produção ou mudanças no app.
> **Limite**: concluído significa investigação registrada, não falhas corrigidas, prontidão de lançamento ou aprovação Google.

## 1. Escopo e fontes

A pesquisa começou com marca independente e objetivo de lançamento público informados
pelo dono. Depois de consultar a professora, o dono decidiu manter seu nome e adotou
**Personal Josy**, preservando as cores. A decisão durável está na
[spec de identidade](../specs/identidade-e-apresentacao-publica.md); sugestões anteriores
não são decisões de produto.

O aprendizado de requisitos, processo, escopos, benchmarks e limites está em
[google-oauth-verificacao.md](../reference/google-oauth-verificacao.md), com fontes
oficiais e data de consulta. Este diagnóstico contém evidências da base examinada,
não uma segunda política Google nem um plano de execução.

Fontes locais principais:

- [Instruções permanentes](../../.github/copilot-instructions.md), especialmente isolamento
  por `ownerEmail`, áreas sensíveis e publicação sem staging.
- [Spec de GCal](../specs/gcal-sync.md), fronteira app/Google e contrato de eventos próprios.
- [index.html](../../index.html), [manifest.json](../../manifest.json), [sw.js](../../sw.js),
  [style.css](../../assets/css/style.css) e [configuração de API](../../assets/js/config/api-config.js).
- [google-identity.js](../../assets/js/auth/google-identity.js),
  [app.js do backend](../../backend/src/app.js),
  [gcalAuthRoutes.js](../../backend/src/routes/gcalAuthRoutes.js) e
  [gcalAuthController.js](../../backend/src/controllers/gcalAuthController.js).
- [requireAuth.js](../../backend/src/middleware/requireAuth.js),
  [gcalSyncService.js](../../backend/src/services/gcalSyncService.js),
  [gcalCrypto.js](../../backend/src/utils/gcalCrypto.js),
  [GoogleCalendarConnection](../../backend/src/models/GoogleCalendarConnection.js) e
  [BloqueioExterno](../../backend/src/models/BloqueioExterno.js).

O estado atual foi reconferido na base acima para registrar os achados inicialmente
discutidos. Não se presume que essa branch seja idêntica ao deploy de produção.

**Ressalva de workspace compartilhado**: na conferência final surgiram alterações
concorrentes no rodapé de reposição em `index.html`, no teste
`tests-frontend/modal-acao-slot.test.js`, nas specs de GCal/Reposições e no plano de
migração documental. Elas não pertencem a esta investigação e não foram revertidas.
O recorte de marca/OAuth examinado permanece o da base identificada acima; a preservação
integral do working tree não pode ser atribuída a esta rodada nem serve de aceite das
mudanças concorrentes.

## 2. Distinções necessárias para interpretar os achados

- Login Google, autorização de Calendar, verificação de marca e verificação de acesso
  a dados são dimensões diferentes. A aprovação de uma não comprova as outras.
- Marca pessoal é compatível com verificação; mudar o nome não corrige segurança nem
  aprova escopos. `Personal Josy` não torna o app Google Workspace `Internal`.
- Resultado estático tem confiança sobre o código, não sobre a configuração efetiva do
  Console, o conteúdo remoto ou a exploração de uma vulnerabilidade em produção.
- Fluxos/desenhos propostos abaixo são opções para avaliação, não contratos aprovados.

## 3. Achados principais

### F01 — Rotas de conexão GCal sem autenticação e escopo de dono confiado ao cliente

**Observado**: `createApp` monta o router em `/api/gcal` e `/api/auth` sem middleware de
autenticação global para esses mounts. `createGcalAuthRoutes` aplica `requireAuth`
somente a `POST /webhook/renew`. `GET /connection`, `POST /exchange` e `DELETE /connection`
não passam por ele. A conexão/consulta/desconexão usa `obterOwnerEmailNormalizado` sobre
body/query, não `getOwnerEmailOrThrow(req)` para determinar o dono.

No exchange, mesmo quando há perfil Google obtido dos tokens, o filtro do upsert utiliza
o email recebido do cliente. Falha de leitura de metadados pode cair nesse email como
fallback. Enviar Bearer no frontend não protege um backend que não o exige.

**Esperado**: a autorização e o filtro de dono decorrem de identidade autenticada, como
exigem as instruções; intenção de conectar outra conta Google, se admitida, precisaria
de contrato explícito e não de confiança em body/query.

**Impacto inferido, confiança alta no código**: consulta indevida de metadados, remoção
da conexão/bloqueios de outro dono e associação indevida de uma autorização ao dono
informado. A consulta não retorna refresh token em `montarRespostaConexao`; retorna,
entre outros, perfil, escopo, `syncToken`, IDs de canal e timestamps. Não extrapolar
para afirmar vazamento direto de todas as aulas, finanças ou do token secreto por essa rota.

**Limite e consideração para ação**: não houve exploração ou chamada real. Recomenda-se
tratar o isolamento como bloqueador de lançamento público. Correção e provas exigem
autorização específica para autenticação/GCal, não substituição de marca.

### F02 — Escopo Calendar mais amplo que o recorte de chamadas localizado

**Observado**: `CALENDAR_SCOPE` solicita `https://www.googleapis.com/auth/calendar`.
`exchangeAuthCode` grava `calendarId: 'primary'`. As chamadas localizadas de GCal trabalham
com eventos, instâncias e canais; não foi localizada gestão de calendários/ACL como
função implementada neste recorte.

**Esperado**: pedir somente o acesso necessário, conforme políticas Google. O alcance
de `calendar` inclui calendários/compartilhamento, além das operações de eventos.

**Inferência, confiança moderada sobre substituição**: `calendar.events.owned` é candidato
para `primary`; `calendar.events` pode ser relevante se houver uso efetivo de outros
calendários acessíveis. O suporte de `events.watch` a esses escopos é documentado, mas
não foi executada a integração completa com eles.

**Limite**: não há decisão de escopo novo, matriz completa validada por I/O, classificação
conferida no projeto nem migração de grants antigos. Escopo menor não garante dispensa
de revisão. Calendário secundário com `calendar.app.created` mudaria o produto atual.

### F03 — Apresentação pública e links legais não localizados na base

**Observado**: `index.html` abre diretamente a interface operacional. Não foram
localizados páginas de privacidade/termos ou links para elas na marcação examinada e
na busca dirigida de arquivos. A área do usuário explica conexão principalmente como
sincronização de compromissos externos e expõe termos técnicos como `MongoDB` e `canal`.

**Esperado**: explicar produto, responsável/contato e tratamento dos dados em apresentação
pública acessível, com privacidade/termos e transparência da função que pede acesso.
A integração também publica aulas do app no Google, não somente importa compromissos.

**Impacto inferido**: ausência de conteúdo necessário para revisar identidade e consentimento,
e explicação insuficiente para o usuário reconhecer as operações feitas em seu nome.

**Limite**: não foi consultada a URL de homepage/privacidade cadastrada no Console; uma
página externa à base pode existir. Não há arquitetura de landing page nem textos legais
aprovados. Ausência no repo não prova ausência em todos os serviços do responsável.

### F04 — Botão principal usa símbolo Google não oficial

**Observado**: `#custom-google-login` em `index.html` usa `fa-brands fa-google`.
`_renderGoogleOfficialButton` também existe, como fallback via SDK, em variante escura,
compacta e circular. A existência desse fallback não substitui a conformidade do botão
principal que o usuário vê/aciona.

**Esperado**: símbolo/asset oficial colorido, proporções e apresentação previstas nas
diretrizes Google. Botão oficial com ícone é alternativa válida; não foi diagnosticado
como errado somente por ser compacto.

**Confiança**: alta sobre a marcação e a divergência de asset; não houve medição visual
de padding, alvo de toque ou render GIS nesta rodada.

**Opção não aprovada**: usar botão/asset oficial escuro pode preservar a paleta do app.
Não há autorização para redesenhar o login ou ajustar suas cores nesta investigação.

### F05 — Desconexão apaga conexão local sem revogação OAuth ou encerramento do canal

**Observado**: `desconectarGoogleCalendar` faz `findOneAndDelete` da conexão e tenta limpar
bloqueios externos com exclusões best-effort. Não há chamada de revogação Google nem
`channels.stop` nesse fluxo. O serviço usa `channels.stop` na renovação, que é outro caminho.

**Esperado**: não confundir exclusão local com revogação de permissão; as políticas
orientam revogar tokens quando não forem mais necessários e eliminá-los. O encerramento
do canal é uma consideração de ciclo de vida independente.

**Impacto inferido**: consentimento remoto permanece sem revogação iniciada pelo app e o
canal pode seguir ativo até expirar. A limpeza best-effort não sustenta promessa de
eliminação imediata de todos os dados. Isso não prova que o app continuará sincronizando
sem token/conexão nem que todos os bloqueios voltarão a aparecer.

**Limite**: não houve desconexão real nem verificação na conta Google. Tratamento de falha,
grants combinados e destino de eventos já publicados precisam de decisão, sem definir
automaticamente que desconectar apagará aulas no Google.

## 4. Considerações adicionais da releitura — não foram homologadas como falhas de produção

### C01 — Divergências do contrato GIS popup e proteção da solicitação

`google-identity.js` utiliza `initCodeClient` com `ux_mode: 'popup'`; o backend troca código
com `redirect_uri: 'postmessage'`. O guia atual utiliza a origem da página nesse modelo.
`requestCode({ hint, prompt: 'consent' })` passa opções não descritas na assinatura atual
de `CodeClient`, que documenta `requestCode()` e `login_hint` na configuração.

Não foi localizada validação de origem/cabeçalho customizado de proteção no exchange;
`createApp` usa `cors()` sem restrição de origem. Autenticar a rota e proteger a intenção
de vinculação são dimensões relacionadas, mas não idênticas.

**Evidência versus hipótese**: as diferenças estão no código/documentação. Efeito sobre
tokens, consentimento repetido ou erros como `redirect_uri_mismatch` não foi reproduzido;
não declarar que o fluxo atual falha em todas as contas. Conferir contrato e configuração
antes de propor alteração em integração em produção.

### C02 — Grants e reconexão não devem ser presumidos pela presença de resposta

O controller exige `refresh_token` no exchange, persiste `tokens.scope` e registra o
canal. Não foi localizada verificação explícita de um conjunto necessário de escopos
antes de declarar conexão. A resposta GIS inclui `scope`, mas o caminho examinado utiliza
principalmente `code`. Sem refresh token novo, o backend orienta revogar acesso e tentar
novamente; não foi homologado o comportamento de reconexão.

**Consideração**: avaliar consentimento parcial, cancelamento, grants acumulados e
reutilização segura da conexão existente. Não forçar reconsentimento nem revogar
autorizações reais com base somente nesta observação.

### C03 — Armazenamento, logs e identidade exigem inventário além da marca

- `_persistSession` grava ID token em `gis_session_cache` no `localStorage`; o perfil é
  gravado em `gis_profile_cache`. A restauração já contém guardas de validade e comparação
  de email; não reapresentar o risco histórico de caches como reprodução nova.
- `gcalCrypto.js` cifra refresh token em AES-256-CBC, IV aleatório e `authTag: null`.
  Não é plaintext; a existência do campo `refreshTokenAuthTag` não prova criptografia
  autenticada. Política de chaves, integridade e acesso não foram auditados.
- `mapEventToBloqueio` persiste ID, título, data e horários de eventos externos. Logs do
  serviço incluem email, título de evento e `syncToken` em caminhos de diagnóstico.
- A resposta de conexão expõe metadados que precisam de avaliação de necessidade. Não
  chamar `syncToken` de access token OAuth: ele é cursor de sincronização, ainda assim
  associado à integração e à conta.
- `requireAuth` valida ID token por biblioteca e dispõe de `googleUserId` a partir de
  `sub`, mas o isolamento usa email. A recomendação Google de identificador estável não
  autoriza migração de chave nesta rodada nem encerra o risco F01.

**Limite**: não se verificaram dados/logs reais, permissões de operadores, backup, retenção,
rotação ou exposição por XSS. Não prescrever migração criptográfica/sessão própria como
se fosse única solução ou requisito específico já aprovado pelo Google.

## 5. Inventário de marca e compatibilidade

| Ponto de contato | Observado | Interpretação |
|---|---|---|
| Cabeçalho e `<title>` em `index.html` | `Prô Josy` / `Prô Josy - Agenda Personal Trainer` | Marca anterior ainda no produto |
| Metadado Apple | `AgendaPersonalTrainer` | Nome de instalação divergente do nome comercial proposto |
| `manifest.json` | `name` e `short_name` como `Prô Josy`; ícones 192/512 | Nome e assets precisam ser avaliados na implementação |
| `sw.js` | Cache com nome da marca anterior | Chave técnica de cache; renomear não prova atualização de todas as instalações |
| README raiz e descrição do backend | Referências à marca anterior | Onboarding/metadados, não autorização para substituição global |
| Domínios Vercel | Frontend `josy-personal-app.vercel.app`, API `personal-app-api.vercel.app` | Configuração conhecida do código/instruções, não prova de domínio OAuth verificado |
| Marcador GCal | `APP_ORIGIN = 'corepersonal'` | Reconhece eventos próprios; não é nome exibido a trocar por estética |

`index.html` contém tag de Search Console e `createApp` serve arquivo de verificação.
Esses artefatos mostram mecanismo preparado, não o resultado no Search Console ou a
aprovação de marca/escopos.

O CSS mantém dourado de identidade e cores distintas para categorias/estados; manifest
e metadados também têm cores existentes. Preservar a paleta não significa normalizar
essas cores diferentes para um único valor. Não foi executada auditoria visual completa.

## 6. Contexto da pesquisa de nomes e posicionamento

MFIT Personal, Tecnofit Personal, My PT Hub e ABC Trainerize foram referências de
posicionamento e apresentação, não modelos de autorização certificados nesta pesquisa.
O eixo observado para este produto é agenda, alunos, reposições e controle financeiro.
O descritor sugerido permanece proposta editorial na spec, não texto legal ou promessa
de recursos como prescrição de treinos, IA ou processamento de pagamentos.

`RitmoPro`, `Cadentra` e `Fiturno` foram sugestões exploratórias; algumas buscas foram
canceladas e não houve clearance de marca/domínio. `TurnoFit`, `Cadeno` e `Aulivo`
apareceram em resultados de produtos existentes; isso é sinal de uso, não conclusão
jurídica. A decisão posterior por **Personal Josy** encerra a direção de marca independente,
sem converter a pesquisa incompleta em comprovação de disponibilidade do nome escolhido.

## 7. Configuração remota e decisões ainda desconhecidas

Não foram verificados:

- Projeto Google Cloud correto, `Audience`, Publishing status, Branding publicado ou em
  revisão, escopos cadastrados/aprovados e lista de OAuth clients.
- Propriedade e conta responsável no Search Console, domínios autorizados, origins,
  redirects e correspondência dos Client IDs frontend/backend em execução.
- Configuração e deploy efetivos na Vercel, logs, dados MongoDB e autorizações reais.
- Existência de política/termos em outro domínio, responsável legal, suporte, retenção,
  exclusão e tratamento de dados por prestadores/backups.
- Disponibilidade jurídica de Personal Josy, domínio e perfis; desenho de logo/ícones.

As decisões abertas da marca estão na spec. As considerações OAuth precisam de
definição e autorização específicas antes de virar contrato ou intervenção.

## 8. Conclusão e limites de encaminhamento

Há uma decisão aprovada de nome e preservação das cores, evidências estáticas de riscos
e um conjunto referenciado de requisitos Google. Não há evidência suficiente para
declarar o aplicativo pronto ou prever sua aprovação. O risco de isolamento F01 não
deve ser ocultado por melhorias de apresentação.

É pertinente separar, na avaliação futura, apresentação/transparência de
autenticação/autorização e ciclo de dados. Isso é recomendação de fronteira, não plano,
priorização, ordem de cartões ou autorização para executar mudanças.

O mock é apropriado para apresentação local, não para comprovar consentimento real ou
segurança no servidor. Nenhuma suíte, mutação, exploração de rota, validação visual ou
submissão Google foi executada nesta investigação documental. Nenhum código, token,
webhook, banco, cor ou domínio foi alterado; os achados permanecem sem correção nesta rodada.