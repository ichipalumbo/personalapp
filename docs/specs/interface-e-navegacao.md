# Spec — Interface, navegação e acessibilidade

> **Status**: Em produção · **Versão**: 1 · **Atualizado**: 2026-10-14
> **Escopo de publicação**: base das etapas mobile já entregue; complementos recentes de FAB/feedback conservam a situação de integração registrada no roadmap. Esta consolidação não executa mudança de interface nem certifica novo deploy.

## 1. Objetivo e fronteira

Manter os contratos transversais já aprovados de navegação, diálogos, leitura dos cards e
acessibilidade fora dos registros de execução. Regras financeiras, cobrança, prazo e ações
de reposição continuam nas respectivas specs; esta não as redefine.

## 2. Navegação e estado

- As três telas principais são Home, Finanças e Alunos, acessíveis pela navegação inferior; o item ativo usa `aria-current="page"`.
- A tela ativa é representada pela hash `#tela-home`, `#tela-financas` ou `#tela-alunos` e sobrevive à recarga.
- O boot normaliza a URL com `replaceState`; navegações seguintes entram no histórico com `pushState`. Voltar/Avançar respeitam a tela da URL, inclusive na primeira navegação após recarregar.
- Hash desconhecida ou malformada usa a tela padrão; um destino que não é tela não inicia navegação.
- A barra inferior e os elementos flutuantes respeitam as safe areas e a altura operacional da barra; não ocupar o mesmo espaço útil de ações/conteúdo.

## 3. Diálogos e foco

- `DialogController` coordena abertura, pilha, foco, Escape e retorno ao disparador. Apenas o topo da pilha é o diálogo modal ativo.
- O diálogo tem nome acessível; o foco inicial vai para seu contexto, sem ativar automaticamente campo de texto e teclado virtual.
- Fechar o topo devolve foco ao contexto anterior/disparador. Não simular empilhamento mantendo dois diálogos modais ativos sem coordenação.
- Cadastro, agendamento e recorrência usam apresentação de tela completa no recorte de até 430px; o viewport de referência do projeto não altera esse breakpoint.
- Descarte de formulário pergunta somente quando há alteração a abandonar. Recorrência e área do usuário não fecham apenas pelo toque no fundo.
- Os fluxos específicos de retorno ao histórico de reposições e os formulários financeiros seguem os contratos das respectivas specs.

## 4. Cards e agenda do Dia

- Detalhes secundários dos cards usam divulgação progressiva, sem exigir toda a informação sempre visível.
- Informação transmitida por ícone mantém nome/descrição acessível; cor não é o único sinal de estado.
- Cards de agenda acionáveis usam botão nativo. O card de aluno tem ação de edição acessível própria; botões/toggles internos não disparam a edição indevidamente.
- Na agenda do Dia, uma banda de dois eventos sobrepostos usa colunas; bandas de três ou mais usam linhas empilhadas. O par com início igual continua em colunas.
- A renderização não duplica componentes de uma mesma banda. Bloqueio de dia inteiro fica fora do grafo de sobreposição; evento externo não ganha ação de edição do app por estar em uma banda.

## 5. Estados, movimento e feedback

- Estados possuem texto/nome acessível e distinção semântica; dourado é identidade, não a cor universal de toda situação financeira ou operacional.
- Grupos de abas e painéis mantêm associação semântica e seleção coerente. Esta consolidação não acrescenta navegação por setas/roving tabindex ao contrato aprovado.
- Foco visível e nomes de botões somente com ícone são preservados. O rótulo de retry é `Tentar novamente`.
- `prefers-reduced-motion` reduz animações/transições aplicáveis; o JS não depende de `animationend` para liberar estado quando a animação não ocorrer.
- Skeletons usam a classe compartilhada, acompanhados do estado/anúncio de carregamento quando aplicável. Erro de leitura não deve ser anunciado como ausência de dados.
- Feedback de operação não bloqueia a tela desnecessariamente; retry é uma ação real. A apresentação inicial/refresh de Finanças obedece à sua spec e não deve acumular sinais redundantes.
- A ampliação de toque entregue em Finanças/grade não encerra os controles do cabeçalho/toolbar: o resíduo do item 5.9 continua aberto. Não ampliar o topo por inferência desta spec.

## 6. Complementos aprovados e limites

Os FABs de Home e Alunos compartilham `.fab-adicionar` como fonte de aparência, mantendo
60px de dimensão, ícone de 24px e escala 0,90 ao pressionar; os IDs identificam ações, não
variações visuais. A ação permanece própria de cada tela, e Finanças não exibe esse FAB.

A publicação desses complementos não é presumida pelo cabeçalho da base já entregue.
O [roadmap oficial](../roadmap-v3.md) conserva o limite de integração, sem reabrir a
navegação anteriormente publicada.

## 7. Verificação e fora de escopo

A validação visual usa o mock e os viewports do [manual de ambiente](../setup-ambiente-local.md).
Testes de lógica/DOM protegem recortes de navegação, diálogo, cards e render; não certificam
pixels, gestos físicos, todos os estados ou integrações remotas. Nenhuma validação visual
nova foi executada para escrever esta spec.

Não inclui redesenho, nova identidade visual, novas telas, solução para o resíduo 5.9,
alteração de cobrança/recorrência, regra nova de cancelamento, revisão de autenticação ou
nova integração com Google Calendar.