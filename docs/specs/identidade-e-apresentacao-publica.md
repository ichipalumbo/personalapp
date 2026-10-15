# Spec — Identidade e apresentação pública

> **Status**: Aprovada, não implementada · **Versão**: 1 · **Atualizado**: 2026-10-14
> **Escopo aprovado**: nome Personal Josy, vínculo com a professora, preservação das cores e objetivo de consistência da apresentação para verificação Google.
> **Limite**: esta spec registra a decisão de identidade; não aprova logo, domínio, textos legais, desenho de autenticação ou execução do rebranding.

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
- Um texto explicativo pode acompanhar o nome, mas sua redação ainda precisa de aprovação.

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
| Descritor `Agenda, alunos e finanças para personal trainers` | Sugestão editorial; não aprovado como texto definitivo |
| Logo, símbolo, tipografia e composição do cabeçalho | A definir e aprovar, preservando as cores |
| Ícones de instalação e asset para consentimento Google | A definir; identidade consistente, sem desenho aprovado |
| Página pública e localização dos links legais no app | A definir; sem arquitetura, URL ou layout aprovados |
| Domínio próprio ou manutenção do endereço atual | A decidir após conferir controle/verificação; nenhuma compra ou migração autorizada |
| Responsável legal, suporte, privacidade, retenção e exclusão | A confirmar com o dono; não inventar dados ou compromissos |
| Escopos, revogação, sessão, proteção OAuth e correções de isolamento | Exigem contrato e autorização específicos; esta decisão de marca não os aprova |
| Data de lançamento, submissão Google e coordenação da publicação | A decidir; não inferir do nome aprovado |

## 5. Fora de escopo

- Implementar o rebranding, planejar cartões/ordem de execução ou publicar o aplicativo.
- Criar logo ou páginas legais definitivas sem resolver as decisões da seção 4.
- Alterar cores, navegação, regras financeiras, recorrência ou conflitos.
- Alterar autenticação, sincronização, tokens, webhooks ou estado remoto.
- Comprar domínio, mudar infraestrutura, criar projetos/clientes Google ou submeter revisão.
- Afirmar disponibilidade jurídica da marca, conformidade LGPD ou aprovação Google.
- Reescrever documentos históricos ou tratar recomendações como decisões aprovadas.

O planejamento de implementação é posterior à consolidação das evidências e à confirmação
das decisões pendentes. Esta aprovação documental não significa mudança de produto,
aceite visual, deploy ou autorização para modificar áreas sensíveis.