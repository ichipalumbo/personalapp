# Personal Josy — Guia de identidade visual

> **Finalidade**: manual geral de marca e briefing exportável para designers e geradores de imagens.
> **Criado/Atualizado**: 2026-10-15 · **Base examinada**: `6199a5145c76c5acca8760e75205a1169860a750`.
> **Fonte das decisões**: [spec de identidade e apresentação pública](../../specs/identidade-e-apresentacao-publica.md).
> **Vigência**: atualizar quando houver decisão aprovada de marca ou mudança dos assets. As recomendações de aplicação precisam de validação no suporte final.
> **Limite**: este guia não implementa o rebranding, não certifica acessibilidade ou aprovação Google e não substitui as specs do aplicativo.

## 1. Como usar

Este manual orienta a aparência da marca, não o funcionamento do produto. Para uso fora
do repositório, entregar este arquivo junto do
[monograma mestre em SVG](pj-entrelacado-preenchido.svg). O símbolo não deve depender de
uma descrição textual para ser reproduzido.

Há três níveis de informação neste documento:

- **Aprovado**: decisão do dono, também registrada na spec de identidade.
- **Existente**: fato observado nos arquivos do app; não significa que o rebranding já foi aplicado.
- **Recomendação de design**: orientação profissional para compor materiais; não é um novo
  contrato de interface nem um desenho final homologado.

A spec é a fonte permanente das decisões. O guia repete uma síntese para poder ser
exportado; em divergência, reconferir a spec e atualizar a síntese, sem manter duas
decisões concorrentes. Não reproduzir números de versão da spec em outros documentos.

### Identidade em uma página

| Elemento | Definição | Natureza |
|---|---|---|
| Nome | **Personal Josy**, com um espaço e essa capitalização | Aprovado |
| Descritor | **Agenda e gestão para personal trainers.** | Aprovado; separado do nome |
| Personalidade | **Profissional e acolhedora** | Aprovado |
| Símbolo | PJ entrelaçado preenchido, P branco e J amarelo, ambos com contorno preto | Aprovado; usar o SVG mestre |
| Movimento do símbolo | Estático, sem ondas, tremor ou animação | Aprovado |
| Família principal | **Poppins** | Aprovado para a direção de marca e futura adoção no app |
| Alternativa tipográfica | **Montserrat**, sem misturar as duas famílias por padrão | Aprovado como alternativa, não segunda família simultânea |
| Direção da assinatura | **Personal** branco e **Josy** amarelo, sem contorno ou sombra no texto | Aprovado; composição final ainda a validar |
| Paleta da interface | Preservar a existente, com papéis distintos de marca, categoria e estado | Aprovado; sem recolorir o app |
| Aplicação no aplicativo | Ainda não executada | Limite do trabalho |

## 2. Essência e expressão da marca

Personal Josy reúne a proximidade de uma marca pessoal e a organização de uma ferramenta
de trabalho. O foco atual do produto é agenda, alunos, reposições e controle financeiro;
não se apresentar como prescrição de treinos, processamento de pagamentos ou inteligência
artificial quando essas capacidades não fazem parte do produto entregue.

**Direção aprovada: profissional e acolhedora.** A expressão recomendada é limpa,
confiável e próxima, com energia controlada. O preto/escuro organiza o espaço, o branco
favorece a leitura e o amarelo cria reconhecimento. A marca não precisa de imagens
agressivas de musculação nem de aparência de joalheria para transmitir valor.

| Atributo | Como traduzir visualmente — recomendação | O que evitar |
|---|---|---|
| Profissional | Alinhamentos claros, hierarquia, acabamento vetorial e informação legível | Elementos improvisados, fontes ornamentais ou excesso de efeitos |
| Acolhedora | Formas equilibradas, linguagem simples e pessoas apresentadas com naturalidade | Estética intimidatória, pressão estética ou promessas de transformação |
| Organizada | Respiro, poucos elementos por composição e ritmo consistente | Colagem de ícones, fundos congestionados e todas as informações em destaque |
| Energética | Amarelo em pontos de identidade e ênfase | Neon, brilho metálico, explosões ou amarelo cobrindo toda a peça |

Esses atributos orientam materiais; não criam novos slogans ou promessas. O descritor
aprovado já explica o produto e não precisa acompanhar toda ocorrência do logo.

## 3. Monograma: desenho e integridade

### 3.1 Arquivo mestre aprovado

**Asset**: `pj-entrelacado-preenchido.svg`.

O P e o J são formas desenhadas em vetor, **não letras digitadas em Poppins ou Montserrat**.
O J passa à frente do P, com separação definida no próprio SVG. A estrutura combina
hastes firmes, curvas arredondadas e terminações retas; conservar a assimetria das letras
e o entrelaçamento, sem espelhar ou tentar igualar as duas formas.

| Característica do mestre | Valor existente a preservar |
|---|---|
| Prancheta | Quadrada, `viewBox 0 0 256 256` |
| Dimensões declaradas | 512×512; vetor escalável, não limite de resolução |
| P | Branco `#FFFFFF` |
| J | Amarelo `#FFD700` |
| Contornos | Preto `#000000` |
| Fundo incorporado | Escuro `#0D0D0D`; o mestre não é transparente |
| Traço colorido | 24 unidades da prancheta |
| Traço preto externo | 28 unidades; diferença de 2 unidades por lado |
| Separação do entrelaçamento | Máscara existente; não remover ou recalcular por estética |

Não expandir traços, simplificar caminhos ou alterar a máscara no arquivo mestre apenas
para atender um gerador. Conversão de formato deve preservar a aparência; ajuste óptico,
versão simplificada ou novo enquadramento precisa de avaliação e aprovação próprios.

### 3.2 Área de proteção e redução

**Recomendação de design, não tamanho mínimo homologado:** usar como módulo de proteção
`u` a espessura principal do traço, 24 unidades na prancheta de 256. Manter pelo menos
`1u` livre entre o contorno externo das letras e textos, bordas, outros logos ou grafismos.

A prancheta mestre já contém margem em torno do desenho. Considerar essa margem ao
posicionar o arquivo; não duplicá-la mecanicamente nem cortar o fundo para aproximar
texto. Usar a borda visível das letras para conferir o respiro, não somente a caixa do SVG.

Como ponto de partida, preferir **48 px ou mais** de lado para o símbolo isolado em
materiais digitais. Aplicações a 32 px exigem conferência específica da separação P/J e
dos contornos; não estão automaticamente homologadas. Favicon de 16 px, impressão,
bordado e outros suportes ainda não possuem versão certificada.

Se a redução perder informação, aumentar o símbolo ou revisar o enquadramento em uma
proposta própria. Não apagar contornos, engrossar uma letra ou criar outra marca por
iniciativa do gerador de imagens.

### 3.3 Fundos e usos proibidos

- Preferir o fundo escuro do mestre, com cores planas e leitura nítida.
- Em página ou material claro, conservar o bloco escuro do SVG. Não inverter as cores
  nem retirar o fundo automaticamente; versões claras, monocromáticas ou transparentes
  ainda não estão aprovadas.
- Sobre fotografia, aplicar o mestre em uma área calma que preserve o fundo incorporado
  e a proteção. Não deixar a imagem competir com o símbolo.
- Não esticar, inclinar, girar, espelhar, mudar as proporções ou trocar P/J de posição.
- Não acrescentar halter, coroa, escudo, coração, contorno circular ou outro emblema ao logo.
- Não usar J vazado, ondas, tremor, sombra duplicada, degradê, cromado, relevo 3D ou brilho.
- Não fazer uma textura ou padrão com logos cortados. Um grafismo de apoio não deve se
  tornar uma versão alternativa do monograma.

## 4. Assinatura: símbolo, nome e descritor

### Direção aprovada

O nome usa **Poppins**, com **Personal branco** e **Josy amarelo**, sobre base escura.
O texto é preenchido, sem contorno preto, sombra ou efeito do cabeçalho antigo.
Os contornos pretos pertencem ao monograma, não a todos os textos da marca.

### Composição recomendada, ainda sem desenho final aprovado

- **Principal horizontal**: símbolo à esquerda, `Personal Josy` à direita, em uma linha.
  Alinhar pelo centro visual, observando o desenho das letras, não só as caixas dos arquivos.
- **Secundária empilhada**: símbolo acima e nome completo abaixo quando o suporte exigir;
  não quebrar o nome em sílabas nem criar uma grafia alternativa.
- **Símbolo isolado**: uso de reconhecimento em ícones ou espaços reduzidos; não substitui
  a identificação completa do produto em uma apresentação pública.
- **Descritor opcional**: abaixo da assinatura, fora da área de proteção, em texto neutro
  claro. Omitir se a escala comprometer sua leitura, sem encurtar a frase por conta própria.

Recomenda-se começar o desenho da assinatura em Poppins SemiBold 600, com mesmo tamanho
e peso nas duas palavras. A cor já cria a diferenciação. Ajustar tamanho, espaçamento e
relação símbolo/texto por comparação real; esses números não estão aprovados para o header.

Em fundo claro, conservar uma base escura para a assinatura proposta ou solicitar uma
aplicação apropriada. Não trocar `Personal` por preto nem usar amarelo como texto pequeno
sobre branco apenas para fazê-lo caber no suporte.

## 5. Sistema cromático

### 5.1 Paleta da marca — valores exatos

Usar **sRGB** para materiais digitais. Os nomes abaixo são rótulos de apresentação,
não novos tokens de CSS. Não substituir os valores por aproximações do gerador.

| Papel | HEX | RGB | Uso |
|---|---|---|---|
| Amarelo de identidade | `#FFD700` | 255, 215, 0 | J, palavra Josy e destaques de marca |
| Branco | `#FFFFFF` | 255, 255, 255 | P e palavra Personal |
| Preto | `#000000` | 0, 0, 0 | Contornos do monograma |
| Fundo escuro | `#0D0D0D` | 13, 13, 13 | Base do mestre e fundo principal existente |

O amarelo é **plano e vivo**, não ouro metálico. Não introduzir um novo amarelo, creme,
bege ou dourado com efeito de luz como substituto. Conversão para CMYK exige perfil e
prova do suporte; não há equivalência de impressão homologada neste guia.

### 5.2 Neutros existentes de apoio

| Papel observado | Cor | Orientação |
|---|---|---|
| Superfície elevada/navegação | `#1A1A1A` | Estruturar áreas sem mudar a base escura |
| Linhas e separadores | `#2A2A2A` | Divisão decorativa, não único sinal de controle/estado |
| Texto principal | `#E0E0E0` | Leitura de conteúdo no app |
| Texto secundário | `#A0A0A0` | Informação de apoio, com contraste conferido no fundo real |

**Recomendação compositiva:** escuros e neutros dominam, branco sustenta a informação e
amarelo pontua a identidade. Não impor porcentagem rígida a uma tela operacional; o
objetivo é evitar que todos os elementos disputem atenção.

### 5.3 Categoria e estado não são cores substitutas da marca

As cores abaixo são existentes no app e conservam seus significados. Não levá-las para
um logo multicolorido nem substituir todas por amarelo durante o rebranding.

| Papel | Cor existente | Uso observado |
|---|---|---|
| Categoria Personal/objetivos associados | `#FFB878` | Tangerina, não cor universal da marca |
| Categoria Consultoria Online | `#5484ED` | Diferenciação da categoria |
| Estado concluído/ok | `#81C784` | Informação de estado |
| Estado informativo/agendado | `#64B5F6` | Informação de estado |
| Estado de aviso | `#FFB74D` | Atenção/pendência |
| Estado de erro | `#FF8A80` | Erro/atraso/expiração conforme a tela |
| Estado neutro | `#CFCFCF` | Em aberto sem atraso |

O manifest e metadados atuais também usam `#1E88E5` como tema e `#FFFFFF` como fundo.
Isso é configuração existente, não aprovação de novo azul para a marca nem permissão
para normalizar esses campos nesta rodada. Assets Google mantêm suas cores oficiais.

## 6. Tipografia: avaliação e direção adotada

### 6.1 Poppins principal; Montserrat alternativa

**Decisão aprovada:** priorizar Poppins na identidade e na futura adoção em toda a
interface, preservando exceções de assets/ícones de terceiros. Montserrat é alternativa
de projeto; não deve ser carregada ou combinada automaticamente como segunda família.

| Critério | Poppins — principal | Montserrat — alternativa |
|---|---|---|
| Característica oficial | Sem serifa geométrica, construção próxima do monolinear, formas circulares e altura-x elevada | Família inspirada em letreiros urbanos de Buenos Aires, com desenho geométrico e revisão para textos longos |
| Leitura editorial de marca | Combina com a direção próxima e acolhedora e com as curvas do PJ | Pode oferecer expressão mais firme nos títulos; não é uma conclusão objetiva de legibilidade |
| Pesos disponíveis no catálogo consultado | 100–900, normal e itálico | 100–900, normal e itálico; distribuição variável disponível |
| Português | Catálogo com Latin e Latin Extended | Catálogo com Latin e Latin Extended |
| Licença dos arquivos consultados | SIL Open Font License 1.1 | SIL Open Font License 1.1 |
| Ponto de atenção na UI | Conferir largura, altura das linhas e distinção dos números no tamanho real | Conferir os mesmos pontos; não presumir que será mais compacta |

A adequação visual é uma avaliação de design, não resultado de teste A/B nem de medição
do app com as fontes carregadas. Ambas podem funcionar; a prioridade escolhida reduz
inconsistência e torna o sistema mais fácil de aplicar.

### 6.2 Hierarquia recomendada

| Papel | Ponto de partida | Limite |
|---|---|---|
| Assinatura Personal Josy | Poppins 600 | Ajuste final de peso/kerning ainda pendente |
| Títulos | 600 ou 700 | Usar 700 para ênfase, não em todo conteúdo |
| Rótulos e ações | 500 ou 600 | Preservar clareza e distinção dos estados |
| Texto corrido | 400 | Preferir espaçamento confortável; evitar pesos 100–300 em textos pequenos |
| Valores financeiros e horários | 500 ou 600 quando destacados | Priorizar leitura e alinhamento, não aparência decorativa |

Para documentos e materiais digitais, começar com texto corrido em 16 px equivalentes,
entrelinha de 1,45–1,6 e informações secundárias por volta de 14 px. Títulos podem partir
de 20–28 px, conforme o suporte. São referências de projeto, **não novos tokens nem
redução automática dos tamanhos existentes**.

Não usar texto corrido em caixa alta, tracking excessivo ou nomes comprimidos para caber.
Utilizar pesos reais da família, sem bold/italic sintéticos. Para números tabulares,
verificar se o arquivo adotado suporta a funcionalidade antes de depender dela.

A família atual do app continua sendo `Segoe UI` com fallbacks de sistema até a
implementação. O fallback técnico futuro deve ser definido e validado; Montserrat não
é substituto métrico automático de Poppins. Ícones Font Awesome e botões oficiais Google
não recebem a fonte da marca por sobrescrita global.

### 6.3 Licença e aplicação futura

As licenças consultadas permitem uso e incorporação, inclusive em materiais comerciais,
sob suas condições. Ao redistribuir os arquivos de fonte, preservar copyright e licença;
não vender a fonte isoladamente. Um material criado com a fonte não precisa, por esse
motivo, receber a licença da fonte.

Este guia não distribui nem instala fontes. Hospedagem local ou remota, seleção de pesos,
subconjuntos, formato e cache serão decisões técnicas da implementação. Avaliar PWA,
carregamento offline, troca de fonte durante o boot e o impacto de requisições externas;
Google Fonts não implica obrigação de carregar a fonte por CDN.

Antes de trocar a fonte do app, conferir os casos como `Personal Josy`, nomes longos,
`Reposições`, `Atenção`, `R$ 1.234,56`, `08:00–09:00`, `15/10/2026`, `0/O` e `1/I/l`.
O viewport de referência é 433×762, DPR 2,81; os stress tests são 320×568 e 390×844,
conforme o manual do projeto. O guia não substitui testes de interface/DOM ou aceite visual.

## 7. Linguagem visual de apoio

**Recomendações para materiais, sem novos assets aprovados:**

- Composições com grade clara, margens consistentes e uma ênfase principal.
- Retângulos de cantos moderados e curvas simples em consonância com o símbolo; evitar
  excesso de pílulas, molduras ou enfeites que concorram com o PJ.
- Grafismos discretos podem evocar organização e continuidade da agenda por linhas e
  ritmo geométrico. Não simular dados, gráficos de evolução ou métricas reais.
- Fundos predominantemente planos. Texturas, se utilizadas, devem ser neutras, discretas
  e externas à área do logo; o símbolo permanece plano e intacto.
- Iconografia funcional e reconhecível. Não misturar famílias de ícones sem necessidade
  nem usar uma figura decorativa como única explicação de uma ação.
- Fotos, quando pertinentes, com luz natural, gestos espontâneos e ambiente de trabalho
  plausível. Não há rosto/roupa/cenário da Josy aprovado para geração: usar referência
  fornecida e autorizada, nunca inventar uma pessoa e apresentá-la como a professora.
- Não usar dados, rostos ou nomes de alunos em prompts ou materiais sem autorização.

O guia é geral: não define campanha, formato de post, calendário editorial ou biblioteca
de componentes. Uma imagem de interface gerada por IA é conceito, não prova do produto
entregue nem autorização para alterar a agenda, as finanças ou os fluxos.

### Tom verbal recomendado

Português do Brasil, frases claras e acolhimento sem infantilização. Preferir explicar
o benefício concreto de organizar o trabalho a prometer resultados físicos ou financeiros.
O nome e o descritor aprovados não são traduzidos ou reescritos pelo gerador.

## 8. Legibilidade e acessibilidade

Cor é um recurso de identidade, não a única forma de transmitir informação. Manter texto,
ícone/nome acessível e estados distinguíveis. Um guia de marca não comprova conformidade
de uma interface; contraste depende do fundo efetivo, transparência, tamanho e uso.

### Pares de cor conferidos

Razões aproximadas por luminância relativa sRGB, sem transparência. A avaliação de
conformidade usa o resultado não arredondado, não uma amostra de screenshot.

| Primeiro plano / fundo | Contraste aproximado | Interpretação para texto |
|---|---|---|
| `#FFD700` / `#0D0D0D` | 13,86:1 | Adequado para texto de identidade sobre o escuro |
| `#FFFFFF` / `#0D0D0D` | 19,44:1 | Adequado para a palavra Personal |
| `#E0E0E0` / `#0D0D0D` | 14,72:1 | Adequado para leitura de conteúdo |
| `#A0A0A0` / `#0D0D0D` | 7,43:1 | Adequado nesse par; reconferir outros fundos |
| `#000000` / `#FFD700` | 14,97:1 | Adequado para texto sobre amarelo |
| `#FFFFFF` / `#FFD700` | 1,40:1 | Não usar para texto informativo |
| `#2A2A2A` / `#0D0D0D` | 1,35:1 | Linha discreta; não basta como único sinal essencial |

WCAG 2.2 AA exige 4,5:1 para texto normal e 3:1 para texto grande conforme sua definição;
informação gráfica essencial e identificação de componentes/estados têm exigências
próprias de 3:1. Uma borda decorativa não precisa ser o sinal que identifica um controle.
O logo possui exceções específicas, mas elas não se estendem a descritores, conteúdos,
nomes de controles ou foco. Não enfraquecer deliberadamente a apresentação por ser logo.

## 9. Usar o guia com um gerador de imagens

### 9.1 O que entregar à ferramenta

1. Este guia, ou o briefing da seção 9.2.
2. O SVG mestre como referência visual, se a ferramenta aceitar. Se não aceitar SVG,
   preparar uma conversão fiel em etapa própria, sem pedir que a IA reconstrua o símbolo.
3. O objetivo da imagem: suporte, público, proporção, conteúdo e espaço necessário para
   aplicar logo/texto posteriormente. Não presumir um formato de rede social neste manual.

**Fluxo recomendado:** gerar o ambiente, fundo ou composição; aplicar o logo exato e os
textos em ferramenta de edição com a família escolhida. Pedido de Poppins no prompt não
garante Poppins no resultado; IA pode alterar letras, grafia, hexadecimais e proporções.

Não aceitar um PJ redesenhado como novo arquivo mestre. Se houver logo/texto na saída,
comparar com os assets e substituir por aplicação controlada quando necessário.

### 9.2 Briefing portátil

> **Marca: Personal Josy.** Aplicativo de agenda e gestão para personal trainers, com
> identidade pessoal, profissional e acolhedora. O descritor é exatamente “Agenda e gestão
> para personal trainers.” A linguagem visual deve ser limpa, organizada e próxima, com
> energia controlada, não agressiva nem de luxo metálico.
>
> Paleta digital sRGB: amarelo plano `#FFD700`, branco `#FFFFFF`, preto `#000000` e fundo
> escuro `#0D0D0D`; neutros de apoio `#1A1A1A`, `#2A2A2A`, `#E0E0E0` e `#A0A0A0`.
> Base predominantemente escura e neutra; amarelo em destaques, branco na leitura.
>
> Símbolo aprovado: usar o arquivo PJ entrelaçado fornecido, com P branco e J amarelo,
> ambos com contorno preto, sobre seu fundo escuro. Não redesenhar, distorcer, espelhar,
> animar ou acrescentar ondas ao símbolo. Tipografia principal Poppins; Montserrat somente
> como alternativa explicitamente escolhida, sem combinar ambas por padrão. Na assinatura,
> “Personal” é branco e “Josy” amarelo, sem contorno ou sombra no texto.
>
> Compor com respiro, alinhamentos claros e poucos elementos. Reservar área limpa para
> aplicar o logo e os textos exatos posteriormente. Não inventar aparência da professora,
> dados de alunos, resultados, funcionalidades ou aprovação Google. Não usar marca Google
> como emblema da Personal Josy. O conteúdo gerado é proposta de material, não produto
> implementado nem novo logo oficial.

### 9.3 Restrições para informar à ferramenta

Não gerar: ouro metálico, neon, 3D no logo, J vazado, letras lado a lado, ondas, tremor,
sombras duplicadas, fontes cursivas/decorativas, nome antigo `Prô Josy`, novos slogans,
emblemas adicionais, texto branco sobre amarelo, telas ou métricas apresentadas como reais,
rostos atribuídos à Josy sem referência, selos de aprovação Google ou aparência copiada
de outra marca. Uma restrição no prompt reduz erros, mas não substitui revisão.

## 10. Conferência de uma aplicação

- O nome está escrito **Personal Josy** e o descritor, quando usado, está exato?
- O logo é o asset aprovado, com proporções, máscara, contornos e fundo preservados?
- P é branco e J é amarelo, sem ondas, vazado ou efeitos?
- A fonte realmente é Poppins, ou a alternativa Montserrat foi escolhida explicitamente?
- A assinatura respeita Personal branco/Josy amarelo sem sombras no texto?
- Há proteção suficiente e leitura em tamanho de uso, não apenas na arte ampliada?
- O amarelo é `#FFD700` plano, e não uma aproximação metálica/neon?
- Estados/categorias, se houver conceito de UI, não foram recoloridos como marca?
- Texto, dados, pessoas e afirmações têm autorização e correspondem ao produto real?
- O resultado evita sugerir endosso Google ou tratar material gerado como interface entregue?

## 11. Fontes e definições ainda abertas

### Fontes consultadas em 2026-10-15

- [Poppins — Google Fonts](https://fonts.google.com/specimen/Poppins),
  [descrição oficial](https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/DESCRIPTION.en_us.html),
  [metadados](https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/METADATA.pb) e
  [licença OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/OFL.txt).
- [Montserrat — Google Fonts](https://fonts.google.com/specimen/Montserrat),
  [descrição oficial](https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/DESCRIPTION.en_us.html),
  [metadados](https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/METADATA.pb) e
  [licença OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/OFL.txt).
- [WCAG 2.2 — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  e [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- Fontes locais: [CSS atual](../../../assets/css/style.css),
  [manifest atual](../../../manifest.json),
  [contrato de interface](../../specs/interface-e-navegacao.md) e
  [manual de ambiente](../../setup-ambiente-local.md).
- Para requisitos específicos de integração e marca Google, consultar
  [a referência OAuth](../google-oauth-verificacao.md). A fonte do botão oficial e os
  logos de terceiros não são substituídos por este manual.

### O que este guia não fecha

Desenho final da assinatura/cabeçalho; tamanho mínimo homologado; versões clara,
monocromática ou transparente; assets PWA/consentimento; impressão; nova iconografia;
tratamento de fotografias específicas; pesos e carregamento da fonte no app. Recomendações
de composição não aprovam automaticamente esses assets ou mudanças.

Identidade aprovada não altera `app_origin = corepersonal`, credenciais, domínios,
collections ou regras de negócio. O endereço atual e o contato provisório estão na spec;
dados pessoais de suporte não precisam ser enviados a um gerador para produzir a aparência
da marca. Responsabilidades legais, privacidade e preparação Google seguem frentes próprias.

Não foram criados novos SVGs, fontes, PNGs, páginas HTML ou capturas para este guia.
O arquivo mestre e o aplicativo permanecem inalterados. O manual é um apoio de design
exportável, não prova de que as aplicações futuras já foram produzidas ou aprovadas.