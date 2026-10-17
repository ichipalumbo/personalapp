# Documentação — `[ADAPTAR: projeto]`

> **Finalidade**: navegação e governança · **Atualizado**: AAAA-MM-DD
> Adaptar os caminhos e a política antes de adotar; os nomes abaixo são exemplos de destino,
> não links que devam resolver dentro deste kit.

## Índice

| Documento/pasta | Finalidade | Quando consultar |
|---|---|---|
| `[ADAPTAR: roadmap]` | Prioridade, resultado, esforço e dependências | Antes de escolher trabalho |
| `[ADAPTAR: specs/]` | Contratos aprovados e duráveis por feature | Antes de mudar comportamento |
| `[ADAPTAR: plans/]` | Frentes, cartões e registro da execução | Para preparar/retomar/validar entrega |
| `[ADAPTAR: diagnostics/]` | Investigação de uma base datada | Para entender causa, impacto ou alternativas |
| `[ADAPTAR: guia de execução]` | Configuração, comandos e procedimentos reais | Para operar/configurar o ambiente |
| `[ADAPTAR: referência]` | Apoio, riscos e aprendizados com fonte/vigência | Antes de trabalhar em área sensível |
| `[ADAPTAR: archive/, se adotado]` | Consulta ao histórico sem manutenção ativa | Para reconstruir decisões, não definir regra vigente |

## Autoridade por assunto

- Spec define o aprovado; código/testes/runtime demonstram o observado na base examinada.
- Plano define a intervenção autorizada e registra provas; não sobrescreve contrato de produto.
- Diagnóstico separa fato, inferência e hipótese; não aprova execução nem prova correção.
- Roadmap sintetiza prioridade/estado; não acumula comandos, contagens ou saga de execução.
- Instruções permanentes definem permissões/invariantes; este índice define governança e
  guias definem procedimentos. Artefato gerado é pista, não fonte normativa.
- Divergência exige investigação e decisão apropriada; não usar um ranking universal para
  justificar bug, mudar regra ou ampliar permissão.

## Conteúdo e limites

| Tipo | Deve conter | Não deve virar |
|---|---|---|
| Spec | Objetivo, escopo, regras, dados/contratos, decisões, casos de borda e exclusões | Backlog, tarefas ou cronologia de correções |
| Diagnóstico | Pergunta, base/método, evidência, observado/esperado, hipóteses, impacto e opções | Plano de execução ou aprovação de produto |
| Plano | Resultado, decisões, escopo, cartões, critérios, validação, execução e pendências | Segunda spec ou depósito de todo texto antigo |
| Referência/guia | Conhecimento e procedimentos com público/fonte/vigência | Backlog paralelo ou regra de produto oculta |

## Ciclo proporcional

1. Identificar contrato, base e autorização.
2. Investigar quando a causa ou decisão for incerta; não exigir diagnóstico para causa evidente.
3. Atualizar/criar spec para contrato durável aprovado; correção de regra existente pode dispensar spec nova.
4. Registrar execução no plano aberto; correção isolada usa plano enxuto conforme a política do projeto.
5. Validar, registrar limites, promover decisão durável e atualizar a síntese autorizada do roadmap.
6. Encerrar distinguindo implementação, validação, aceite e publicação.

Não exigir diagnóstico + spec + plano para toda tarefa. `[ADAPTAR]` a regra de melhoria curta
e rastreabilidade quando um plano separado não acrescentar valor. O padrão do kit não gera
relatório final separado por rodada nem saga nova como substituto de fonte permanente.

## Metadados e estados

| Tipo | Campos mínimos | Estados sugeridos: escolher um |
|---|---|---|
| Spec | Status, versão documental, atualizado, limites pertinentes | Rascunho; Aprovada/não implementada; Em implementação; Em produção; Substituída |
| Plano | Status, abertura/atualizado, responsável, base, fontes | Rascunho; Aguardando decisão; Em execução; Em validação; Encerrado; Cancelado |
| Diagnóstico | Status, data/base, escopo, fontes/método | Em análise; Concluído; Inconclusivo; Substituído |

Versão/status da spec vivem no seu cabeçalho. Medições datadas e listas de arquivos podem
ser evidência de execução, sem virar contador vivo duplicado ou fonte de comportamento.

## Histórico e manutenção

- `[ADAPTAR]` Política de arquivamento e responsável pela autorização; não interpretar este
  modelo como permissão para mover, apagar ou podar arquivos do projeto.
- Preservar informação única antes de retirar texto. Classificar por trecho: contrato,
  investigação, execução, procedimento, duplicação ou hipótese ainda não verificada.
- Documento encerrado não é reescrito silenciosamente; continuação referencia a base anterior.
- Movimentação autorizada preserva conteúdo e ajusta links. Arquivar não resolve defeito,
  encerra pendência de produto nem publica código.
- Validar links e caminhos reais; placeholders, exemplos e caminhos históricos precisam
  ser distinguidos de referências que deveriam existir hoje.
- Revalidar fonte de risco antes de tratá-lo como ativo ou resolvido; não manter backlog em referência.
- Modelos/kit de outro projeto não governam automaticamente o consumidor. Adaptar com decisão local.