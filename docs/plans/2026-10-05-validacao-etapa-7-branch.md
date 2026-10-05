# Validação — Etapa 7 (branch `feat/etapa-7-consistencia-acessibilidade`)

> **Status**: 🚧 FIX APLICADO — aguardando o re-teste do item 1.3 no deploy da branch
> **Aberto em**: 2026-10-05
> **Commit sob validação**: `71e24b4` (branch `feat/etapa-7-consistencia-acessibilidade`)
> **Deploy**: provisório no Vercel, a partir da branch

---

## Como usar este arquivo

1. Abra o preview: **`Ctrl+Shift+V`** (ou `Ctrl+K V` para abrir ao lado).
2. Clique na caixinha para marcar. Se na sua versão o clique não alternar, dê **duplo clique**
   — o preview abre o editor na linha exata, e é só trocar `[ ]` por `[x]`.
3. Onde houver **campo de resposta** (linhas com `>`), escreva em texto livre o que observou.
4. Ao terminar, peça para o agente **ler este arquivo**.

Marque só o que você realmente testou. **Item não testado fica vazio** — isso é informação, não
falha. O agente vai ler o que ficou vazio e tratar como pendência, não como aprovado.

---

## Ambiente da validação (preencher)

- Data: <!-- preencher -->
- Dispositivo / Android: <!-- preencher -->
- Como abriu: <!-- navegador (Chrome) · PWA instalado · os dois -->
- Desktop usado (para o item do pill): <!-- largura da janela -->
- Observação: <!-- qualquer coisa do ambiente que possa explicar um resultado -->

---

## ⚠️ Defeito conhecido — leia antes de começar

Achei e **provei** com teste isolado, depois do commit: em **recarga**, a primeira navegação
usa `replaceState` em vez de `pushState`, então **o Voltar pula uma tela**.

Reprodução exata:

1. Abra o app e vá para **Finanças**
2. **Recarregue** a página (continua em Finanças — isso é o Cartão D funcionando)
3. Toque em **Alunos**
4. **Voltar** → vai para a **Home**, pulando as Finanças

Esperado: Voltar deveria voltar para **Finanças**.

- [x] **Reproduzi e confirma o comportamento descrito**
- [ ] **Não reproduzi** — o Voltar voltou para Finanças (se for o caso, descreva o que fez)

Decisão sobre o defeito (marque uma):

- [x] **Corrigir antes do merge** — o agente corrige, roda a suíte, e eu refaço o deploy da branch
- [ ] **Corrigir depois do merge** — vira item próprio no roadmap
- [ ] **Aceitar como está** — não vale corrigir

---

## 1. Cartão D — navegação com URL

| # | O que fazer | Esperado |
| --- | --- | --- |
| 1.1 | Home → Finanças → Alunos, olhando a barra de endereço | A URL termina em `#tela-financas` e depois `#tela-alunos` |
| 1.2 | **Recarregar estando em Finanças** | Continua em Finanças — não volta para a Home |
| 1.3 | Botão Voltar do navegador, depois Avançar | Percorre as telas visitadas, na ordem |
| 1.4 | Abrir `.../#tela-alunos` numa aba nova | Abre direto em Alunos |
| 1.5 | Trocar a hash na mão para `#lixo` | Não quebra, não troca de tela, e a URL se corrige sozinha |
| 1.6 | **Abrir o PWA instalado** (app fechado antes) | Cai na **Home** — esperado, o `start_url` é fixo em `/index.html` sem hash |

- [x] 1.1
- [x] 1.2
- [ ] 1.3
- [x] 1.4
- [x] 1.5
- [x] 1.6

> Resposta 1: O 1. 3 nao funcionou e é o comportamento listado em defeitos conhecidos!<!-- o que observou -->

---

## 2. Cartão D — pill "Modo leitura"

**No celular ele NÃO deve aparecer.** É o comportamento decidido (só a partir de 768px). Não é
regressão — não reporte como defeito.

| # | O que fazer | Esperado |
| --- | --- | --- |
| 2.1 | No celular, deslogado | O pill **não** aparece. Fica só "Entrar com Google" |
| 2.2 | No desktop, janela ≥768px, deslogado | O pill aparece no meio do header |
| 2.3 | No desktop, logado | O pill some (dá lugar à área do usuário) |
| 2.4 | No desktop, olhando o header | O pill não empurra o layout nem estoura a linha |

- [x] 2.1
- [x] 2.2
- [x] 2.3
- [x] 2.4

> Resposta 2: <!-- o que observou -->

---

## 3. Cartão B — teclado e leitor de tela ⚠️ nunca validado

Este é o item que **o agente não conseguiu verificar**: neste ambiente os eventos de teclado não
chegam à página, nem para um botão que já existia antes da mudança. O mecanismo está correto no
código; o comportamento real nunca foi observado por ninguém. **É a validação mais importante
desta lista.**

| # | O que fazer (teclado físico) | Esperado |
| --- | --- | --- |
| 3.1 | Tab até um card da agenda da semana → Enter | O card abre |
| 3.2 | Tab até o **lápis** no card do aluno → Enter | Abre a edição do aluno |
| 3.3 | Tab por um **evento externo** do Google Calendar | **Não recebe foco** — é o único card não acionável, de propósito |
| 3.4 | Tab por uma tela inteira | O contorno de foco aparece sempre no elemento certo |
| 3.5 | Dentro de um modal, Tab até o fim | O foco circula dentro do modal, não escapa para trás |
| 3.6 | Escape com um modal aberto | Fecha, e o foco volta ao botão que abriu |
| 3.7 | TalkBack: abas Semana/Dia | Se anunciam como abas, com "selecionado" no estado certo |

- [x] 3.1
- [x] 3.2
- [x] 3.3
- [x] 3.4
- [x] 3.5
- [x] 3.6
- [x] 3.7

> Resposta 3: <!-- se o Enter não funcionar, diga exatamente onde e o que aconteceu -->

---

## 4. Cartão C — movimento reduzido

| # | O que fazer | Esperado |
| --- | --- | --- |
| 4.1 | Ativar "Remover animações" (Opções do desenvolvedor do Android) | Skeletons param de pulsar |
| 4.2 | Com isso ativo, provocar um toast de carregamento | O spinner não gira |
| 4.3 | Com isso ativo, fazer o swipe de período na Home | Sem animação **e sem travar** |
| 4.4 | Desativar "Remover animações" | As animações voltam ao normal |
| 4.5 | Provocar um toast de erro e olhar o botão | Diz **"Tentar novamente"** |

- [x] 4.1
- [x] 4.2
- [x] 4.3
- [x] 4.4
- [x] 4.5

> Resposta 4: <!-- o swipe travou? sobrou alguma animação? -->

---

## 5. Cartão A — cores de estado

| # | O que fazer | Esperado |
| --- | --- | --- |
| 5.1 | Salvar algo com sucesso (toast verde) | Texto escuro sobre fundo claro, legível |
| 5.2 | Tentar salvar deslogado (toast de aviso) | Idem, legível |
| 5.3 | Desligar a rede e usar o "Tentar novamente" do toast | Idem, legível |
| 5.4 | Tela de Finanças: procurar o que era dourado como *estado* | Dourado ficou só para identidade e ação primária |

- [x] 5.1
- [x] 5.2
- [x] 5.3
- [x] 5.4

> Resposta 5: <!-- alguma cor que ficou estranha ou ilegível? -->

---

## 6. Regressão — o que pode ter quebrado sem querer

| # | O que fazer | Esperado |
| --- | --- | --- |
| 6.1 | Tocar na área livre do card de aluno | Abre a edição |
| 6.2 | Tocar no toggle Ativo/Inativo do card | Alterna, **sem** abrir a edição |
| 6.3 | Tocar no lápis do card | Abre a edição **uma vez só** (sem duplo disparo) |
| 6.4 | Tocar num card da agenda | Abre normalmente, como antes |
| 6.5 | Modal de novo agendamento: as 3 abas (Aula / Deslocamento / Bloquear) | Trocam o conteúdo corretamente |
| 6.6 | **Criar um agendamento de verdade** e conferir | Salva, aparece na agenda, sincroniza |
| 6.7 | Tela de Finanças com dados reais | Cards corretos, sem número estranho |

- [x] 6.1
- [x] 6.2
- [x] 6.3
- [x] 6.4
- [x] 6.5
- [x] 6.6
- [x] 6.7

> Resposta 6: <!-- qualquer coisa que pareça diferente do que era antes -->

---

## 7. O que o agente já validou (não precisa repetir)

No mock, em 433×762 DPR 2.81 com emulação de toque: contraste dos toasts (8,65 / 7,62 / 10,06:1),
comportamento do pill por largura (oculto até 600px, visível a partir de 768px sempre dentro da
tela), o ciclo completo de navegação, `prefers-reduced-motion` emulado nos dois estados, e as duas
suítes — backend 232/232 e frontend 91/91.

**O que ele NÃO conseguiu validar, e por isso está na sua lista:** teclado físico, leitor de tela,
`prefers-reduced-motion` no aparelho real, e nada com dados de produção.

Nota de escopo: a branch mexe em **0 arquivos de `backend/`**. A API está intocada neste deploy —
o que muda é só o frontend.

---

## Veredito

- [ ] **APROVADO** — pode subir para a `main`
- [ ] **APROVADO COM RESSALVA** — subir e tratar o resto como item novo
- [x] **REPROVADO** — precisa corrigir antes

> Observações finais:Precisamos verificar o 1.3 <!-- qualquer coisa que não caiba nas respostas acima -->

---

## Registro da execução (agente) — 2026-10-05

**Leitura do checklist**: 35 marcadas, 6 vazias (todas alternativas não escolhidas). Veredito do
dono: **REPROVADO**, corrigir antes do merge. Único item reprovado: **1.3**, identificado pelo
próprio dono como o defeito conhecido acima.

**O que a validação confirmou de novo**: a seção 3 (teclado e TalkBack) passou inteira, nos 7
itens. Era a ressalva registrada na documentação da etapa — "a ativação por teclado não pôde ser
observada neste ambiente" — e agora tem observação real. As seções 2, 4, 5 e 6 também fecharam
completas.

**Correção aplicada** (`assets/js/app/router.js`, em `registrarTelaNaUrl`): a flag
`jaEscreveuNaUrl` passou a ser marcada como "o boot já passou" — antes da comparação de hash — em
vez de só depois de uma escrita bem-sucedida. Em deep link ou recarga já em `#tela-financas` não
há o que escrever, e a flag ficava `false`, fazendo a **primeira** navegação do usuário usar
`replaceState` em vez de `pushState`. Sem entrada criada, o Voltar pulava uma tela.

**Cobertura nova**: `tests-frontend/router-historico.test.js` ganhou o caso "após boot por deep
link, a primeira navegação do usuário também empilha" — que é exatamente o caminho da recarga.

**Provas medidas**:

| Verificação | Resultado |
| --- | --- |
| Suíte de frontend antes do fix | 91/91 (medido no commit `71e24b4`) |
| Suíte de frontend depois do fix | **92/92**, 0 falhas |
| Suíte de backend (inalterada) | **232/232**, 0 falhas |
| Mutação: remover o fix | falha **só** o teste novo (`not ok 72`) ✅ |
| Navegador real, ciclo completo | boot `#tela-home` → Finanças → **recarregar (fica em Finanças)** → Alunos → **Voltar → Finanças** ✅ → Avançar → Alunos ✅ |

O ciclo no navegador é a reprodução exata do 1.3, na mesma sequência que o dono usou (recarregar
antes de navegar). Antes do fix o Voltar ia para a Home; agora vai para Finanças.

**Pendente**: refazer o deploy da branch e **re-testar só o 1.3**. Se passar, o item 5.7 fecha e o
resultado entra no roadmap.

**Ainda em aberto neste arquivo**: a seção "Ambiente da validação" continua sem preenchimento
(data, aparelho, PWA × navegador, largura do desktop). Sem isso o registro não diz contra o que
foi validado — preencher ou remover a seção.

---

## Depois da validação

Este arquivo é o registro da rodada. O resultado entra no roadmap (item 5.7) e o arquivo pode ser
**podado** depois — a poda é exceção autorizada para peso morto, e conclusão/defeito registrado
migra antes para o roadmap ou para `reference/APRENDIZADOS.md`.
