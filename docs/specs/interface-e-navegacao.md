# Spec — Interface, navegação e acessibilidade

> **Status**: Em implementação · **Versão**: 6 · **Atualizado**: 2026-10-23
> **Escopo de publicação**: base das etapas mobile já entregue; padronização dos topos, listas e hierarquia tipográfica de Alunos/Finanças aprovada e implementada na branch, ainda sem integração à `main`. Publicação e aceite dessas alterações continuam com o dono; o roadmap conserva a situação dos demais complementos.

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
- Cabeçalho e toolbar da Home têm alvos mínimos de 44 px para conta, login Google, abas, setas e Hoje. O antigo resíduo do item 5.9 foi consolidado e implementado na frente de identidade; a integração não é presumida por esta spec.

## 6. Complementos aprovados e limites

Os FABs de Home e Alunos compartilham `.fab-adicionar` como fonte de aparência, mantendo
60px de dimensão, ícone de 24px e escala 0,90 ao pressionar; os IDs identificam ações, não
variações visuais. A ação permanece própria de cada tela, e Finanças não exibe esse FAB.

A publicação desses complementos não é presumida pelo cabeçalho da base já entregue.
O [roadmap oficial](../roadmap-v3.md) conserva o limite de integração, sem reabrir a
navegação anteriormente publicada.

### 6.1 Topos das telas principais

- Home, Finanças e Alunos compartilham `.topo-tela` como fonte única da superfície e
	`.topo-tela-conteudo` como fonte do recuo interno, seguindo o visual da Home:
	fundo escuro translúcido, desfoque, sombra e somente os cantos inferiores arredondados.
- Os três topos ficam presos abaixo do cabeçalho da marca durante a rolagem, usando
	a mesma variável de altura medida pelo app. Não há decoração ou margem externa
	particular por tela; a altura de cada topo depende do seu próprio conteúdo.
- Listas e cards permanecem fora do topo. Home mantém as abas e a navegação da agenda;
	Finanças mantém título, Atualizar, cache, progresso e mensagens, com as regras de
	leitura e recuperação da spec financeira preservadas.
- Alunos tem o título **Seus Alunos** e o subtexto **Cadastre alunos, edite seus dados e
	acompanhe as reposições.** O FAB de cadastro, os controles dos cards e os modais
	permanecem nas posições e fluxos próprios, fora do topo.
- Em Finanças, título e subtítulo ficam juntos na coluna de texto à esquerda,
  alinhados pelo topo como em Alunos. Atualizar e seu progresso ficam na coluna
  à direita, sem empurrar os textos para baixo; o botão conserva 44×44 px.
  Cache e mensagens continuam abaixo das colunas e o texto pode quebrar em
  telas menores, sem truncamento.
- A altura do cabeçalho da marca é medida e publicada em `--header-height`;
	o padrão CSS antes dessa medição é 65 px, sem fallbacks diferentes por consumidor.
- Na Home semanal, abaixo de 380 px o período usa forma compacta, por exemplo
	`19–25/10`, mantendo o intervalo completo em `title` e `aria-label`.
	Na virada de mês, o mês visível é o final (`28–03/01`); o intervalo completo
	continua acessível. A mudança de faixa atualiza o rótulo sem recriar a grade.

### 6.2 Listas de Alunos e Finanças

- As listas usam `.lista-tela` para manter 12 px de separação entre o cabeçalho e
	o primeiro card na abertura da tela, inclusive durante o carregamento.
- A lista de Alunos não possui fundo, borda, cantos ou recuo lateral próprios de
	um painel externo. Os cards ocupam a largura útil disponível, como em Finanças,
	preservando seus próprios fundos, bordas, controles e espaçamento entre cards.
- A separação das listas não altera a fixação dos cabeçalhos durante a rolagem.

### 6.3 Hierarquia visual dos cards

- Finanças segue Alunos como referência tipográfica, sem copiar seu conteúdo de
	cadastro: nomes nas duas listas usam `.aluno-card-nome`, com tamanho de 1,05 rem
	e peso 700. O título de Finanças usa o ícone de carteira da mesma família de
	ícones do título de Alunos, mantendo o nome acessível pelo texto.
- Períodos financeiros usam 0,75 rem e peso 600. Status e rótulos dos blocos
	Aulas, Valor, Ciclo e Cobrança usam 0,75 rem e peso 700, sem conversão visual
	para maiúsculas ou espaçamento artificial entre letras. Status preservam texto
	e cor semântica, sem fragmentos de emojis.
- Detalhes financeiros seguem os recuos de Alunos (8 px acima e 2 px de margem;
	conteúdo com 8 px de separação), preservando o alvo mínimo de 44 px das
	expansões e de 48 px das ações dos cards financeiros.
- Valores continuam destacados, com os blocos, textos, estados, ações e regras
	financeiras preservados. A semelhança visual não equipara o status cadastral
	do aluno ao pagamento do ciclo nem substitui o valor do ciclo pelo cadastro.

## 7. Verificação e fora de escopo

A validação visual usa o mock e os viewports do [manual de ambiente](../setup-ambiente-local.md).
Testes de lógica/DOM protegem recortes de navegação, diálogo, cards e render; não certificam
pixels, gestos físicos, todos os estados ou integrações remotas. Medições e limites de
validação de cada alteração ficam no registro da frente, sem certificar o app inteiro.

Fora dos topos, listas e hierarquia visual aprovados nas seções 6.1 a 6.3, não inclui redesenho, nova identidade visual ou novas telas,
alteração de cobrança/recorrência, regra nova de cancelamento, revisão de autenticação ou
nova integração com Google Calendar.