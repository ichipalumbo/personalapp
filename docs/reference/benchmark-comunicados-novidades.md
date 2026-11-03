# Referência — Comunicados de novidades e atualizações

> **Finalidade**: apoiar a escolha de um mecanismo para comunicar novidades e correções aos usuários do Personal Josy, distinguindo comunicação de atualização técnica.
> **Consulta**: 2026-11-03 · **Fontes**: documentação e código públicos dos próprios produtos e documentação oficial das plataformas web.
> **Vigência**: referência pontual; produtos, documentação e interfaces podem mudar. Recomendações são propostas, não decisões aprovadas nem garantia de funcionamento no app.

## 1. Pergunta e limites

O dono descreveu como objetivo apresentar um comunicado ao usuário ao abrir o app após um longo período, deixá-lo fechado depois de dispensado e permitir reabri-lo facilmente na Área do usuário. O conteúdo deve contemplar funcionalidades novas e correções de bugs. O significado de “longo período” ainda não foi decidido.

Esta pesquisa confronta esse objetivo com o [plano de atualização existente](../plans/2026-11-03-plan-atualizacao-app.md) e exemplos públicos. Não houve teste de contas nos produtos citados, pesquisa quantitativa com usuários, validação no aparelho do dono ou inspeção de produção. Os exemplos são uma amostra pequena: não demonstram uma regra universal nem uma taxa de adoção pelo mercado. As duas aplicações desktop ilustram padrões de interface, não comportamento de PWA.

O plano atual se concentra em identificar versão e recarregar o app; seu escopo exclui “o que há de novo”. O comunicado desejado é, portanto, uma necessidade de produto distinta e exige revisão explícita do escopo antes de implementação. Este documento não altera nem revoga o plano ou as decisões anteriores.

## 2. Mini benchmark

| Produto | Evidência de fonte primária | Lição e limite |
|---|---|---|
| **VS Code** | A configuração `update.showReleaseNotes` permite abrir notas após atualização e tem padrão ativado; o código verifica certas mudanças de versão antes de abrir as notas. [M1, M2] | Existe comunicação de novidades separada de preferências de atualização. É um app desktop; isso não prova a existência de um aviso por ausência prolongada ou o comportamento de uma PWA. |
| **GitHub Desktop** | Um banner de novidades oferece “what’s new” e dispensa; ao dispensar, o código grava localmente a versão vista. O mesmo componente tem opções relacionadas a reiniciar para atualizar. [M3] | Informação, dispensa e ação técnica podem coexistir sem serem a mesma ação. O trecho consultado não demonstra acesso pelo menu de configurações nem sincronização da dispensa entre dispositivos. |
| **Notion** | A página pública “What’s New” reúne lançamentos, melhorias e correções. [M4] | Um histórico de novidades pode ser consultado depois; a página não demonstra quando o app abre um aviso nem como registra a dispensa. |
| **Slack** | As notas públicas de desktop são organizadas por versão/data e incluem correções e avisos de segurança. [M5] | É possível distinguir novidades, correções e avisos importantes. A página não comprova um modal ao abrir o app ou uma política de tempo de ausência. |

**Síntese observada**: há precedentes para apresentar novidades, permitir dispensar uma sinalização e manter notas consultáveis. As fontes pesquisadas não estabelecem quantos dias caracterizam “longo período”, nem provam que todos esses produtos usem o fluxo exato proposto para o Personal Josy.

## 3. Duas necessidades diferentes

| Necessidade | Pergunta que responde | Relação com o objetivo |
|---|---|---|
| **Comunicado de novidades** | “O que mudou para mim desde que consultei as novidades?” | É o objetivo principal descrito pelo dono; precisa de conteúdo, uma regra de apresentação/dispensa e acesso posterior. |
| **Atualização técnica** | “O código desta sessão corresponde a uma publicação mais recente e como aplicá-la?” | Pode ter valor próprio, mas não é pré-requisito conceitual para um comunicado. Consultar um comunicado não prova que o código em execução foi atualizado. |

A recomendação desta pesquisa é **priorizar o comunicado e não torná-lo dependente de recarga automática**. Um aviso sobre aplicação técnica pode ser estudado separadamente se houver necessidade real. Essa separação não significa ignorar falhas que já existam no mecanismo técnico atual.

### Limite específico do app

O [service worker atual](../../sw.js) usa `skipWaiting()` e `clients.claim()`, e o [registro do cliente](../../assets/js/app-shell/service-worker.js) chama recarga em `controllerchange`. Essas linhas existem independentemente de uma futura feature de comunicado. O [diagnóstico auditado](../diagnostics/2026-11-03-diag-atualizacao-app.md) registra que essa transição pode atingir páginas antigas sem a nova guarda; é uma inferência a validar em navegador, não um defeito reproduzido nesta pesquisa.

A orientação do Chrome explica que, em muitos casos, deixar o ciclo normal do worker ocorrer pode ser suficiente; apresenta a oferta de recarga como **uma opção para alguns cenários**, não como obrigação universal. A documentação da plataforma alerta que `skipWaiting()` pode fazer um worker novo controlar uma página carregada sob condições anteriores. [T1, T2] Não é correto concluir, apenas com este benchmark, que basta remover `skipWaiting()` ou que a mudança do worker é automaticamente segura. O risco atual e a transição de clientes instalados requerem investigação, autorização e validação próprias.

## 4. Recomendação de experiência para discussão

1. **Conteúdo editorial, não log de deploy**: preparar um comunicado com linguagem simples e seções como “Novidades” e “Correções”, incluindo apenas mudanças úteis para o usuário. Uma publicação técnica sem alteração perceptível não precisa necessariamente criar novo comunicado. Isso é recomendação editorial, não uma regra já aprovada. Os exemplos Notion e Slack mostram notas de mudanças, não exigência de notificar cada deploy. [M4, M5]
2. **Apresentação na abertura**: verificar se há comunicado relevante ainda não dispensado e, se houver, abrir um painel de novidades com ação de fechar. A definição exata de “abrir”, primeira visita, ausência prolongada e quando um comunicado é considerado relevante continua para decisão do dono.
3. **Depois do fechamento**: registrar qual comunicado foi dispensado, em vez de apenas uma flag genérica permanente; assim um comunicado posterior pode ser tratado separadamente. Oferecer acesso “Novidades” ou “O que há de novo” na Área do usuário, inclusive depois de dispensar. O histórico a manter e o que fazer com várias versões pendentes precisam ser decididos.
4. **Não interromper trabalho**: se outro diálogo, formulário ou operação estiver ativo, avaliar um momento seguro para apresentar o comunicado. A [spec de interface](../specs/interface-e-navegacao.md) já prevê coordenação de diálogos e foco. W3C recomenda, para modal, nome acessível, foco contido, fechamento visível e restauração apropriada do foco. [T3]
5. **Conteúdo honesto**: não dizer “app atualizado” somente porque o comunicado foi lido ou o token remoto foi encontrado. Se o HTML ou outros recursos vierem de cache, o texto pode não representar a versão de código em execução; o desenho precisa explicitar como lidar com conteúdo potencialmente antigo.

### Tempo de ausência

Não há evidência na amostra de um intervalo de referência. Como ponto de partida para discutir, considerar apresentar novidades ainda não dispensadas **na próxima abertura**, independentemente de exigir um número mínimo de dias. Uma ausência prolongada pode justificar um resumo de várias novidades, mas não precisa ser um pré-requisito para informar uma correção relevante. Isso é uma recomendação, não um padrão comprovado nem decisão do dono. Se o dono realmente quiser um limiar de ausência, será necessário escolher o prazo, como medir a última abertura e como tratar primeira visita e múltiplas atualizações.

## 5. Onde guardar que o comunicado foi fechado

| Alternativa | Vantagem | Limitação a aceitar e validar |
|---|---|---|
| **Armazenamento local, por conta e navegador** | Candidato simples, sem endpoint novo; `localStorage` mantém dados entre sessões da mesma origem. [T4] | Não sincroniza automaticamente entre dispositivos ou navegadores; pode ser apagado, bloqueado ou indisponível. A chave deve ser isolada por conta para uma conta não dispensar o comunicado de outra na mesma origem. |
| **Armazenamento no backend, por conta** | Permite sincronizar a dispensa entre dispositivos autenticados. | Exige modelo, rota e consultas autenticadas filtradas por `ownerEmail`, além de decisões para offline e falhas. Não é automaticamente necessário para a primeira entrega. |
| **`sessionStorage`** | Útil para estado temporário por aba. [T5] | Normalmente termina com a sessão da aba, então não satisfaz sozinho a expectativa de manter o comunicado fechado ao voltar dias depois. |

Para reduzir complexidade, **armazenamento local por conta e navegador** é uma proposta inicial, desde que o dono aceite a limitação entre dispositivos e o comportamento em caso de armazenamento indisponível. Não guardar credenciais nesse estado. Várias abas da mesma origem também exigem tratamento explícito para não apresentar indevidamente múltiplos comunicados; o evento `storage` informa mudanças a outros documentos, mas não é prova de coordenação atômica. [T6]

A Área do usuário atual exige sessão ativa para abrir ([settings-modal.js](../../assets/js/settings-modal.js)); portanto o acesso às novidades sem login, inclusive offline, não deve ser presumido. A sincronização entre login, troca de conta, abertura automática e diálogo existente precisa ser especificada e testada se essa opção for adotada.

## 6. Avaliação das decisões do plano anterior

| Decisão registrada | Avaliação diante do objetivo esclarecido |
|---|---|
| Verificar ao abrir e manualmente | Coerente com uma experiência de novidades consultadas na abertura, mas as regras de comunicado ainda precisam ser definidas. Não implica que uma sessão sempre aberta seja avisada de uma publicação posterior. |
| Recarregar automaticamente em versão detectada | Não é necessário para comunicar novidades e acrescenta risco de interrupção e complexidade. Recomenda-se reconsiderar essa exigência para esta feature, preservando a análise do comportamento existente do worker. |
| Comparar token no HTML com `version.json` | Resolve uma pergunta técnica diferente; não identifica se um comunicado editorial foi lido e não comprova coerência de todos os recursos. Pode ser desnecessário para a solução de comunicado, conforme o desenho adotado. |
| Guardas de modal, operação e edição | A precaução continua útil para não interromper a pessoa, embora o comunicado não precise necessariamente da mesma máquina de estados de recarga. |
| Permitido recarregar com aba oculta; fechar automaticamente a Área do usuário | Essas escolhas tratam da recarga técnica. Não são automaticamente necessárias para mostrar um comunicado; convém reconsiderá-las, sem modificar a decisão registrada antes de nova aprovação. |
| Bump de token em PR que altera frontend | É política para identificação técnica. Para comunicados, é preferível discutir uma identidade editorial separada e publicar novidades quando houver conteúdo relevante; isso ainda depende de decisão. |
| Transição P1/P2 do worker | Se o worker for alterado, os riscos de clientes antigos permanecem relevantes. Se o comunicado puder ser desenhado sem alterá-lo, P1/P2 não devem ser presumidas como requisito dessa feature; o reload atual continua sendo um risco independente. |
| Verificação somente na abertura ou manual | Adequada ao objetivo informado de mostrar novidades ao abrir, desde que “abertura” e conteúdo disponível sejam definidos. Não informa automaticamente alguém que mantém o app aberto indefinidamente; o dono deve aceitar ou mudar esse limite. |

## 7. Questões para decisão antes de replanejar

1. **Gatilho**: abrir na próxima abertura sempre que houver comunicado não dispensado ou exigir também um tempo mínimo sem uso? Como tratar a primeira abertura e uma aba restaurada?
2. **Conteúdo**: mostrar apenas o comunicado mais recente, agrupar tudo que não foi visto ou usar outro resumo? Deve existir histórico consultável, e até quando?
3. **Persistência**: dispensa por conta e navegador é suficiente ou deve acompanhar a conta em outros dispositivos? Qual comportamento é aceitável se o armazenamento falhar ou for apagado?
4. **Primeiro contato e tela**: quando houver login pendente, outro diálogo, recuperação de dados ou formulário aberto, onde o comunicado espera e quando pode aparecer? Como reabrir na Área do usuário?
5. **Publicação**: quem redige, revisa e publica cada comunicado; quais alterações merecem aviso; e como evitar que uma versão do comunicado mencione funcionalidades que ainda não chegaram ao cliente?
6. **Risco independente**: quando e em qual frente validar o reload existente do service worker? A decisão sobre comunicação não deve tratá-lo como corrigido.

Essas perguntas não são decisões tomadas nesta pesquisa. A revisão do plano ou da spec exige aprovação explícita do dono.

## 8. Fontes

- **M1 — VS Code**, configuração de atualização e notas: <https://github.com/microsoft/vscode/blob/main/src/vs/platform/update/common/update.config.contribution.ts>.
- **M2 — VS Code**, abertura de notas conforme versão: <https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/update/browser/update.ts>.
- **M3 — GitHub Desktop**, banner, dispensa, registro local e acesso às notas: <https://github.com/desktop/desktop/blob/development/app/src/ui/banners/update-available.tsx>.
- **M4 — Notion**, página pública de novidades: <https://www.notion.com/releases>.
- **M5 — Slack**, notas públicas da versão desktop para macOS: <https://slack.com/release-notes/mac>.
- **T1 — Chrome Developers**, opções para lidar com atualização de service worker: <https://developer.chrome.com/docs/workbox/handling-service-worker-updates>.
- **T2 — web.dev**, ciclo de vida de service worker e limites de ativação: <https://web.dev/articles/service-worker-lifecycle>.
- **T3 — W3C WAI**, padrão acessível de diálogo modal: <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>.
- **T4 — MDN**, persistência e limites de `localStorage`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>.
- **T5 — MDN**, escopo e duração de `sessionStorage`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage>.
- **T6 — MDN**, evento de armazenamento entre documentos: <https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event>.

As URLs e as implementações dos produtos foram consultadas em 2026-11-03 e podem mudar. As fontes técnicas descrevem APIs e padrões gerais; não são evidência de testes do Personal Josy.
