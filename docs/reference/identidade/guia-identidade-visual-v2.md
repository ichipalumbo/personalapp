# Personal Josy — Guia de identidade visual

> **Criado:** 15 de outubro de 2026 · **Atualizado:** 16 de outubro de 2026.
> **Escopo:** identidade do aplicativo Personal Josy, aplicação no cabeçalho e materiais digitais de divulgação.
> **Situação:** arte-final e versões complementares aprovadas pelo responsável nesta conversa. Implementação no aplicativo ainda não realizada neste trabalho.
> **Base documental:** guia anterior, aprovações desta conversa e arquivos do kit completo de marca. As características técnicas do kit foram conferidas nesta atualização.
> **Referência histórica da interface:** revisão `6199a5145c76c5acca8760e75205a1169860a750`, informada no guia anterior; não revalidada no código nesta atualização.
> **Limites:** este guia não altera o app, não comprova testes de acessibilidade, não certifica registro de marca ou aprovação Google e não atualiza automaticamente as especificações do projeto.

## 1. Como usar e o que mudou

Este guia consolida a identidade aprovada para o **aplicativo**, não para os serviços pessoais da Josy como personal trainer. Deve acompanhar o kit de marca quando o trabalho for entregue a designers, desenvolvedores ou responsáveis pela divulgação.

### 1.1 Mudança principal

O **calendário amarelo com J em recorte transparente e duas presilhas brancas** substitui o antigo monograma PJ entrelaçado como símbolo da marca.

O monograma anterior passa a ser **referência histórica**, não uma alternativa oficial. As antigas regras de P branco, J amarelo com contorno preto, sobreposição, máscara e prancheta quadrada do PJ não se aplicam ao novo símbolo. Na identidade atual, o J é justamente o espaço vazio dentro do calendário; não é uma letra amarela nem uma área preta pintada.

A arte-final horizontal, a escrita isolada, o símbolo isolado e as quatro composições complementares estão aprovados. Esta atualização documenta essas decisões, sem redesenhar os arquivos.

### 1.2 Níveis de informação

- **Aprovado:** decisão visual confirmada pelo responsável nesta conversa.
- **Conferido no kit:** propriedade verificada nos arquivos entregues, como formato, cores, dimensões e ausência de texto dependente de fonte.
- **Informado no guia anterior:** referência técnica do aplicativo que não foi revalidada no repositório nesta atualização.
- **Recomendação:** orientação de aplicação que ainda exige conferência no suporte final.
- **Pendente:** implementação ou validação não executada neste trabalho.

A aprovação visual de uma composição não homologa automaticamente seu tamanho mínimo, comportamento responsivo, acessibilidade ou uso em qualquer fundo.

### 1.3 Relação com as especificações do projeto

O guia anterior remetia à especificação de identidade e apresentação pública como fonte permanente do projeto. Essa especificação não foi fornecida nesta etapa e não foi editada. **As novas decisões registradas aqui precisam ser sincronizadas com ela pelo responsável pelo projeto**, especialmente a substituição do PJ pelo calendário com J.

Até essa sincronização, não interpretar a descrição antiga do monograma como autorização para reintroduzi-lo. Em divergências técnicas, consultar o responsável antes de implementar; não misturar decisões antigas e novas.

### Identidade em uma página

| Elemento | Definição atual | Situação |
| --- | --- | --- |
| Marca | **Personal Josy**, com um espaço e essa capitalização | Aprovado |
| Produto | Aplicativo de agenda e gestão para personal trainers | Escopo confirmado |
| Descritor | **Agenda e gestão para personal trainers.** | Aprovado; separado do nome |
| Personalidade | Profissional, organizada e acolhedora | Direção mantida |
| Símbolo | Calendário amarelo, duas presilhas brancas e J em recorte transparente | Aprovado |
| Escrita | Personal branco e Josy amarelo, em Poppins SemiBold 600 convertida em curvas | Aprovado |
| Descritor nos arquivos | Poppins Regular 400 em curvas, em cinza-claro | Conforme registro de produção do kit |
| Acabamento | Cores planas, sem contorno, sombra, degradê ou animação | Aprovado |
| Composições | Horizontal, escrita, símbolo, empilhada, duas com descritor e avatar | Sete composições aprovadas |
| Header | Horizontal transparente, sem descritor, no canto superior esquerdo | Simulação aprovada; aplicação pendente |
| Divulgação prioritária | Instagram e status do WhatsApp; adaptação vertical também pode atender Stories | Escopo de uso |
| Interface | Preservar paleta funcional, componentes e regras existentes | Sem autorização de redesenho global |

## 2. Essência e expressão da marca

Personal Josy organiza o trabalho de personal trainers. A comunicação deve partir de funções reais do aplicativo: agenda, alunos, reposições e controle financeiro, conforme a descrição do produto no guia anterior. Não anunciar prescrição de treinos, processamento de pagamentos ou inteligência artificial sem confirmação de que essas capacidades foram entregues.

O calendário comunica organização; o J aproxima o símbolo do nome. O amarelo traz energia, o escuro estrutura a composição e o branco sustenta a leitura. A marca não precisa de aparência de academia, musculação agressiva ou luxo metálico.

| Atributo | Tradução visual recomendada | Evitar |
| --- | --- | --- |
| Profissional | Alinhamento, hierarquia, acabamento limpo e informação legível | Improviso, efeitos excessivos e fontes ornamentais |
| Acolhedora | Formas equilibradas, linguagem simples e apresentação próxima | Intimidação, pressão estética e promessas de transformação |
| Organizada | Respiro, poucos elementos e sequência clara de leitura | Colagem de ícones e todas as informações em destaque |
| Energética | Amarelo em pontos de identidade e ênfase | Neon, cromado, brilho e grandes massas amarelas sem função |

Esses atributos orientam as peças, mas não criam um novo slogan. O descritor aprovado já explica o produto e não precisa acompanhar toda aparição da marca.

## 3. Símbolo: calendário com J

### 3.1 Desenho aprovado

O símbolo é uma geometria vetorial própria: corpo de calendário com cantos arredondados, duas presilhas superiores brancas e um **J formado por espaço negativo** no interior.

O J do símbolo não deve ser reconstruído digitando uma letra em Poppins. A indicação de Poppins nos metadados do conjunto diz respeito à escrita da marca; o calendário e seu recorte têm desenho próprio aprovado.

| Característica | Valor a preservar |
| --- | --- |
| Prancheta do símbolo isolado | `viewBox="0 0 224 245"` |
| Corpo do calendário | Amarelo plano `#FFD700` |
| Presilhas | Branco `#FFFFFF` |
| J interno | Recorte realmente transparente no mesmo caminho do corpo |
| Regra do recorte | `fill-rule="evenodd"` no caminho amarelo |
| Contornos | Não existem traços de contorno no desenho aprovado |
| Fundo | Transparente ou base escura `#0D0D0D` |
| Dependências | Sem fonte externa, bitmap incorporado, script ou animação |
| Comportamento | Estático; proporção e orientação preservadas |

Na versão transparente, o fundo do suporte aparece através do J. Na versão escura, aparece a base escura do próprio arquivo. **Não substituir o recorte por uma letra ou mancha preta:** isso impede a aplicação correta em outros fundos.

### 3.2 Integridade dos arquivos

Usar os SVGs do kit como mestres. Não traçar o desenho a partir de uma imagem de apresentação, não simplificar curvas, não arredondar novamente os cantos e não alterar a espessura do recorte.

Escala uniforme é permitida. Mudanças no desenho, versões simplificadas, novas cores ou enquadramentos diferentes das composições entregues exigem aprovação própria.

O símbolo isolado tem enquadramento compacto e não é quadrado. **Para perfil quadrado, usar o avatar pronto**, em vez de esticar o símbolo ou recortá-lo para preencher a imagem.

### 3.3 Proteção e redução

**Recomendação inicial, não mínimo homologado:** reservar em torno da marca um respiro de pelo menos um quarto da largura visível do calendário. No mestre do símbolo, isso corresponde a 56 unidades. Na aplicação, o valor deve acompanhar a mesma escala do desenho.

Para a escrita isolada, considerar o calendário na escala equivalente da assinatura horizontal como referência de proteção. O respiro é externo ao conjunto; não serve para recalcular a distância já aprovada entre símbolo e nome.

Os mestres compactos de horizontal, escrita e símbolo precisam de margem na composição externa. As versões empilhadas, com descritor e o avatar já contêm margens: conferir o respiro visível antes de somar outra margem mecanicamente. Não remover margens do avatar para aumentar o calendário.

Não há tamanho mínimo homologado nesta etapa. Conferir, no tamanho efetivo de uso:

- Leitura do J e separação das duas presilhas.
- Leitura integral do nome, sem compressão ou quebra de linha.
- Legibilidade do descritor, quando presente.
- Distância de controles, bordas e outros elementos.

Se a redução prejudicar a leitura, aumentar a marca ou escolher uma composição sem descritor. Não engrossar o J, eliminar presilhas ou criar uma simplificação por iniciativa própria. Favicon, bordado e impressão ainda exigem avaliação específica.

## 4. Composições aprovadas e escolha do arquivo

As sete composições são aplicações da mesma identidade, não marcas concorrentes.

| Composição | Estrutura | Uso prioritário |
| --- | --- | --- |
| Horizontal | Símbolo à esquerda; nome em uma linha à direita | Header e assinatura principal |
| Somente escrita | Personal Josy, sem símbolo | Assinatura discreta e peças já identificadas |
| Somente símbolo | Calendário com J, com enquadramento compacto | Reconhecimento da marca em espaços adequados |
| Empilhada | Símbolo acima; nome completo em uma linha abaixo | Peças em que a horizontal não se acomode bem |
| Horizontal com descritor | Assinatura horizontal e frase abaixo, alinhada à escrita | Apresentação do app com espaço para a explicação |
| Empilhada com descritor | Símbolo, nome e frase em sequência vertical | Apresentação em composição mais compacta |
| Avatar | Símbolo centralizado em prancheta quadrada, com margem | Foto de perfil e recorte circular |

### 4.1 Escrita da marca

A assinatura usa **Personal em branco** e **Josy em amarelo**, com o mesmo peso e tamanho de fonte. O arquivo vetorial incorpora ajustes de espaçamento aprovados. Não redigitar o nome esperando reproduzir a mesma assinatura, nem alterar o espaçamento de letras para fazê-la caber.

O nome fica em uma linha inclusive nas versões empilhadas. Não usar `PERSONAL JOSY`, `PersonalJosy`, `Personal Josi` ou o antigo `Prô Josy` como grafias alternativas do logo.

### 4.2 Descritor

Frase exata: **Agenda e gestão para personal trainers.**

Preservar acentos, palavras e ponto final. A frase explica o aplicativo; não integra o nome e não é uma promessa de resultado. Nas composições entregues, ela está em Poppins Regular 400, cinza-claro `#E0E0E0`, convertida em caminhos vetoriais.

Usar apenas quando houver tamanho de leitura confortável. No header, em avatar e em aplicações muito pequenas, preferir a composição sem descritor. Não encurtar a frase, trocar a fonte ou aproximá-la da escrita por conta própria.

### 4.3 Formatos e dimensões do kit

Todas as composições têm SVG e PNG, em fundo transparente e escuro. Os SVGs não dependem de uma fonte instalada. As dimensões abaixo descrevem os PNGs entregues, não uma obrigação de tamanho na interface ou uma recomendação de formato de publicação.

| Composição | PNG entregue | Variantes de fundo |
| --- | --- | --- |
| Horizontal | 2400 × 382 px | Transparente e escuro |
| Somente escrita | 2400 × 351 px | Transparente e escuro |
| Somente símbolo | 2194 × 2400 px | Transparente e escuro |
| Empilhada | 2400 × 1597 px | Transparente e escuro |
| Horizontal com descritor | 2400 × 741 px | Transparente e escuro |
| Empilhada com descritor | 2400 × 1819 px | Transparente e escuro |
| Avatar | 1080 × 1080 px e 512 × 512 px | Transparente e escuro |

**Inventário conferido:** 14 SVGs e 16 PNGs de marca, além da prancha de apresentação e dos documentos de organização. Os PNGs do kit incluem perfil de cor sRGB.

### 4.4 Identificação dos arquivos

Os nomes começam por `personal_josy_`, indicam a composição e terminam em `transparente` ou `escuro`. A extensão define se o arquivo é SVG ou PNG. A redução do avatar tem o sufixo adicional `512`.

| Exemplo de nome | Identificação |
| --- | --- |
| `personal_josy_horizontal_transparente.svg` | Principal para o header sobre base escura |
| `personal_josy_empilhada_escuro.png` | Empilhada com base escura incorporada |
| `personal_josy_horizontal_com_descritor_transparente.svg` | Apresentação horizontal com a frase explicativa |
| `personal_josy_empilhada_com_descritor_escuro.png` | Apresentação empilhada com base escura |
| `personal_josy_avatar_escuro_512.png` | Avatar quadrado reduzido com fundo escuro |

Os SVGs compactos entregues anteriormente como `personal_josy_horizontal.svg`, `personal_josy_escrita.svg` e `personal_josy_simbolo.svg` correspondem aos mestres transparentes preservados no kit. Para novas aplicações, preferir o conjunto organizado do kit completo.

Preferir SVG quando a ferramenta de destino o aceitar. Usar PNG quando for necessário um arquivo rasterizado. Não ampliar um PNG pequeno como substituto de exportar o SVG na dimensão necessária.

### 4.5 Arquivos históricos e prévias

O monograma PJ e os arquivos da primeira proposta não são os mestres atuais. As imagens `personal_josy_instagram.png` e `personal_josy_status_whatsapp.png` foram criadas antes da arte-final: são prévias e precisam ser refeitas com os vetores aprovados antes de servirem como campanha final.

As pranchas e a simulação de header documentam a apresentação. Não recortar o logo delas para usar como arquivo de marca. Manter as referências históricas separadas do kit ativo para evitar uso acidental.

## 5. Sistema cromático

### 5.1 Paleta da marca

Usar sRGB nos materiais digitais. Os valores são exatos; não substituir o amarelo por aproximações metálicas ou por cores estimadas de uma captura de tela.

| Papel | HEX | RGB | Aplicação |
| --- | --- | --- | --- |
| Amarelo de identidade | `#FFD700` | 255, 215, 0 | Corpo do calendário, palavra Josy e destaques |
| Branco | `#FFFFFF` | 255, 255, 255 | Presilhas e palavra Personal |
| Fundo escuro | `#0D0D0D` | 13, 13, 13 | Base escura e aplicação principal |
| Cinza-claro | `#E0E0E0` | 224, 224, 224 | Descritor nas composições e texto de apoio |

O preto `#000000` pertencia aos contornos do antigo PJ. **Não é uma tinta de contorno nem uma área de preenchimento do J na nova marca.**

O amarelo é plano e vivo, não ouro metálico. Não usar degradê, brilho, cromado, relevo ou neon. Conversão para impressão depende do perfil e da prova do suporte; não há equivalente CMYK homologado neste guia.

### 5.2 Neutros da interface

Os valores abaixo foram informados no guia anterior e são mantidos como referência, sem nova auditoria de código.

| Papel informado | Cor | Orientação |
| --- | --- | --- |
| Superfície elevada e navegação | `#1A1A1A` | Estruturar áreas sem mudar a base escura |
| Linhas e separadores | `#2A2A2A` | Divisão discreta, não único sinal essencial |
| Texto principal | `#E0E0E0` | Leitura de conteúdo |
| Texto secundário | `#A0A0A0` | Apoio, com contraste conferido no fundo final |

Recomendação: escuros e neutros estruturam, branco informa e amarelo pontua a identidade. Isso não impõe porcentagens rígidas a uma tela operacional.

### 5.3 Cores de categoria e estado

As cores funcionais não são variantes do logo. Preservar os papéis relatados no guia anterior; a atualização da identidade não autoriza recolorir todos os elementos para amarelo.

| Papel informado no app | Cor | Uso informado |
| --- | --- | --- |
| Categoria Personal e objetivos associados | `#FFB878` | Tangerina de categoria, não amarelo de marca |
| Consultoria Online | `#5484ED` | Diferenciação da categoria |
| Concluído ou ok | `#81C784` | Estado |
| Informativo ou agendado | `#64B5F6` | Estado |
| Aviso | `#FFB74D` | Atenção ou pendência |
| Erro | `#FF8A80` | Erro, atraso ou expiração conforme a tela |
| Neutro | `#CFCFCF` | Estado em aberto sem atraso |

O guia anterior também informa `#1E88E5` como cor de tema e `#FFFFFF` como fundo nos metadados do app. Esses valores não foram revalidados nem modificados aqui. A aprovação da marca não autoriza alterar manifest, ícones de instalação ou assets de terceiros automaticamente.

## 6. Tipografia

### 6.1 Identidade consolidada

| Elemento | Tratamento atual | Regra |
| --- | --- | --- |
| Nome Personal Josy | Poppins SemiBold 600, em curvas | Usar o vetor aprovado com o espaçamento existente |
| Descritor | Poppins Regular 400, em curvas | Usar a composição aprovada; não remontar em fonte semelhante |
| Calendário com J | Geometria própria em vetor | Não reconstruir digitando uma letra |
| Textos das peças | Poppins como família principal | Conferir peso, tamanho, acentos e leitura |
| Montserrat | Alternativa de projeto mantida do guia anterior | Não substituir o nome nem misturar famílias por padrão |

Os arquivos SVG conferidos contêm caminhos, sem elementos de texto dependentes de fonte. A informação de família e peso vem dos registros de produção e metadados do kit. Isso não significa que a fonte já esteja instalada ou aplicada no restante do aplicativo.

A assinatura está fechada: as antigas indicações de que o desenho e o espaçamento do nome ainda estavam pendentes deixam de valer.

### 6.2 Hierarquia para conteúdos — recomendação

| Papel | Peso de partida | Cuidado |
| --- | --- | --- |
| Títulos | 600 ou 700 | Usar 700 para ênfase, não em todo o conteúdo |
| Rótulos e ações | 500 ou 600 | Preservar distinção dos estados e leitura |
| Texto corrido | 400 | Evitar pesos muito finos em textos pequenos |
| Valores financeiros e horários | 500 ou 600 quando destacados | Priorizar leitura e alinhamento |

Como referência editorial do guia anterior, texto corrido pode começar em 16 px equivalentes, informações secundárias em 14 px e títulos entre 20 e 28 px, com entrelinha confortável. São pontos de partida, não novos tokens ou redução automática dos tamanhos existentes.

Usar pesos reais, sem bold ou itálico sintéticos. Não comprimir letras para fazer nomes longos caberem. Recursos de números tabulares precisam ser conferidos no arquivo de fonte adotado.

### 6.3 Adoção futura no app

O guia anterior informa Segoe UI com fallbacks de sistema como família então existente. Não houve inspeção do código nem troca global de fonte nesta etapa.

A eventual adoção de Poppins na interface continua sendo uma frente técnica separada: selecionar pesos, formato, hospedagem, fallback, cache e comportamento offline; testar nomes longos, horários, valores e mensagens. Montserrat não deve ser usada como substituta automática sem conferência de métricas.

Ícones e botões oficiais de terceiros não recebem a fonte da marca por sobrescrita global. Os SVGs do logo não precisam carregar uma fonte para aparecer corretamente.

### 6.4 Procedência e arquivos de fonte

Os metadados dos assets registram Poppins SemiBold 4.003 para a escrita principal e Poppins Regular 4.003 para o descritor, com referência à Indian Type Foundry. Os documentos do kit identificam SIL Open Font License 1.1 como licença da família utilizada.

O kit contém desenhos em curvas, não arquivos de fonte. Uma eventual distribuição ou incorporação de arquivos tipográficos deve preservar e conferir a licença correspondente na implementação. Esta atualização documental não realizou nova verificação jurídica ou consulta aos repositórios das fontes.

## 7. Aplicação no cabeçalho do app

### 7.1 Decisão aprovada

- Usar a **horizontal transparente**, no canto superior esquerdo.
- Substituir a identificação antiga **Prô Josy** por **Personal Josy**.
- Não usar descritor, sombra, contorno ou animação no header.
- Preservar a proporção do arquivo e a relação símbolo/nome.
- Manter espaço para o botão à direita e para os demais elementos existentes.

A simulação feita a partir do print foi aprovada como referência visual. **O aplicativo não foi alterado.**

### 7.2 Orientações de implementação

Preferir o SVG aprovado e definir uma dimensão de referência mantendo a outra proporcional. O `viewBox` horizontal é `0 0 1538.26 245`; as dimensões intrínsecas do arquivo não são uma exigência de largura em pixels CSS.

Na simulação, a assinatura ocupava aproximadamente 308 × 49 pixels do bitmap enviado. Esses números são medidas da imagem, **não valores CSS**, pois não houve medição do DOM, confirmação da escala da captura ou teste em um dispositivo.

Não recriar o logo como texto do header: aplicar o arquivo aprovado. Em telas menores, ajustar o espaço e a escala sem esticar, cortar ou quebrar o nome. Caso a composição deixe de funcionar, submeter a adaptação à validação, em vez de trocar silenciosamente pela escrita ou pelo símbolo isolado.

### 7.3 Conferência necessária

- Leitura no aparelho real, não só no print ampliado.
- Relação com botões, foco, alvos de toque e demais elementos do header.
- Ausência de corte e sobreposição em larguras menores.
- Nome acessível definido conforme a função do logo; evitar duplicação desnecessária com texto visível.
- Se o logo virar link ou botão, preservar a função, a navegação e os estados do componente.
- Carregamento correto e preservação da transparência.

O guia anterior informa viewport de referência de 433 × 762, DPR 2,81, e testes de esforço em 320 × 568 e 390 × 844. Manter esses casos como referências históricas do projeto, confirmando sua aplicabilidade na implementação.

Não fazem parte desta etapa: trocar o ícone de instalação, gerar favicon homologado, alterar o manifest, aplicar Poppins globalmente ou redesenhar a navegação.

## 8. Fundos, avatar e materiais digitais

### 8.1 Fundos

| Situação | Aplicação recomendada |
| --- | --- |
| Fundo escuro uniforme | Versão transparente, preservando as cores exatas |
| Fundo claro | Versão com base escura ou composição específica previamente aprovada |
| Fotografia | Área calma e leitura conferida; se necessário, base escura com respiro |
| Fundo colorido | Conferir presilhas, escrita e J; preferir base escura se houver competição |

A transparência não garante que o logo funcione em qualquer superfície. Branco e amarelo podem perder leitura em fundos claros. Não tornar Personal preto nem pintar o J para resolver a aplicação sem aprovação.

Os mestres escuros compactos não incluem necessariamente a margem externa necessária a uma peça. Quando houver enquadramento em um bloco escuro, reservar respiro suficiente também fora do desenho.

### 8.2 Avatar

Usar o avatar fornecido, preferencialmente com fundo escuro para um resultado previsível. A versão transparente depende do fundo aplicado pela ferramenta de destino.

O calendário está centralizado com margem para recorte circular. O círculo visto na prancha é demonstração do recorte, **não um contorno ou emblema que integra o logo**. Não aumentar o símbolo até encostar nas bordas, não adicionar descritor e não colocar texto em volta do perfil.

Os PNGs de 1080 × 1080 e 512 × 512 px são exportações do kit, não uma afirmação sobre exigências atuais das plataformas. Conferir o enquadramento na publicação efetiva.

### 8.3 Instagram, status e Stories

As prioridades de divulgação são Instagram e status do WhatsApp. Uma mesma campanha pode ter adaptações de composição; não basta esticar uma arte quadrada para torná-la vertical.

- Usar a assinatura com descritor quando a peça estiver apresentando o app a quem ainda não o conhece.
- Omitir o descritor quando a própria mensagem explicar o produto ou quando ele ficar pequeno demais.
- Para perfil, usar o avatar, não a assinatura horizontal reduzida.
- Conferir recortes, áreas ocupadas pela interface da plataforma e leitura no celular.
- Não confundir as dimensões dos PNGs do logo com o tamanho final da peça social.
- Refazer as primeiras prévias sociais com esta arte-final antes de tratá-las como materiais finais.

O kit de marca está concluído; posts, modelos de campanha e mensagens de lançamento continuam sendo peças a desenvolver separadamente.

## 9. Linguagem visual e verbal de apoio

### 9.1 Composição

Usar grade clara, margens consistentes e uma ênfase principal. Curvas simples e cantos moderados podem dialogar com o calendário sem criar emblemas adicionais. Evitar excesso de molduras, pílulas e elementos decorativos.

Grafismos de apoio podem sugerir organização e continuidade da agenda, mas não devem imitar um novo logo nem simular métricas reais. Não transformar marcas cortadas em textura.

Priorizar fundos planos. Texturas, se usadas, devem ser discretas e externas à área de proteção da marca. Manter iconografia funcional e consistente, sem misturar famílias desnecessariamente.

### 9.2 Conteúdo e pessoas

Usar português do Brasil, frases diretas e acolhimento sem infantilização. Explicar benefícios concretos de organização; não prometer resultados físicos, financeiros ou capacidades não entregues.

Não inventar a aparência da Josy nem apresentar uma pessoa gerada como se fosse ela. Fotos identificáveis e referências pessoais exigem autorização. Não expor dados, rostos ou nomes de alunos em peças, prompts ou capturas públicas sem autorização; preferir demonstrações com dados fictícios claramente identificados.

Uma tela gerada por IA é conceito, não evidência do produto entregue. Não apresentar recursos fictícios, gráficos ou selos como fatos.

## 10. Legibilidade e acessibilidade

O guia preserva as referências de contraste do documento anterior para cores sólidas sRGB. Transparência, fotografia, tamanhos e contexto exigem nova conferência no suporte final.

| Par de cores | Contraste aproximado | Orientação de uso |
| --- | --- | --- |
| Amarelo `#FFD700` sobre escuro `#0D0D0D` | 13,86:1 | Boa separação visual para a identidade |
| Branco `#FFFFFF` sobre escuro `#0D0D0D` | 19,44:1 | Base da palavra Personal e das presilhas |
| Cinza-claro `#E0E0E0` sobre escuro `#0D0D0D` | 14,72:1 | Par usado no descritor |
| Cinza `#A0A0A0` sobre escuro `#0D0D0D` | 7,43:1 | Conferir outros fundos antes de reutilizar |
| Branco `#FFFFFF` sobre amarelo `#FFD700` | 1,40:1 | Não usar para texto informativo |
| Linha `#2A2A2A` sobre escuro `#0D0D0D` | 1,35:1 | Divisão discreta; não único sinal essencial |

As presilhas são partes do símbolo, não texto informativo branco sobre amarelo. Essa composição aprovada não autoriza usar branco sobre amarelo em mensagens, rótulos ou no descritor.

A leitura do J depende do fundo que aparece no recorte. Cor não deve ser a única forma de comunicar categoria, estado ou ação. Descritor, controles, foco, navegação e conteúdo precisam de avaliações próprias; as particularidades de um logo não certificam a acessibilidade do restante da interface.

Este documento não é um laudo de conformidade. Na implementação, aplicar os critérios de acessibilidade adotados pelo projeto e testar texto, contraste, foco, navegação e nomes acessíveis em contexto.

## 11. Usos proibidos

- Reintroduzir o antigo PJ como alternativa oficial à marca atual.
- Esticar, comprimir, girar, espelhar ou alterar as proporções.
- Refazer o calendário por descrição textual ou a partir de uma captura da prancha.
- Pintar de preto o J, fechar o recorte, trocar sua forma ou convertê-lo em uma letra sobreposta.
- Retirar, deslocar ou recolorir as presilhas.
- Acrescentar traço preto, sombra, brilho, degradê, cromado, textura, relevo ou animação ao logo.
- Adicionar halter, coroa, escudo, coração, borda circular ou outro emblema ao desenho.
- Trocar a Poppins do nome por uma fonte semelhante, mudar o espaçamento ou quebrar Personal Josy em duas linhas.
- Inverter as cores ou criar versão monocromática sem aprovação.
- Usar o quadriculado de transparência como se fosse o fundo da arte.
- Alterar ou abreviar o descritor, criar slogans automaticamente ou usar Prô Josy na nova assinatura.
- Recolorir categorias e estados do app como consequência automática do rebranding.
- Alterar logos, cores ou botões de terceiros, ou sugerir endosso Google.

As antigas proibições genéricas de “J vazado” e “letras lado a lado”, relacionadas ao monograma, **não se aplicam à identidade atual**. O recorte em J e o nome horizontal são partes aprovadas do desenho presente.

## 12. Briefing portátil para designers e geradores de imagens

### 12.1 Materiais a fornecer

1. Este guia atualizado.
2. O arquivo oficial da composição desejada, em SVG ou PNG fiel.
3. Objetivo da peça, público, proporção, conteúdo e área reservada para logo e textos.
4. Referências de imagens autorizadas, quando necessárias.

**Fluxo recomendado:** criar o ambiente ou a composição de apoio e aplicar depois o logo exato e os textos em uma ferramenta de edição. Pedir Poppins e cores em um prompt não garante fonte, grafia ou hexadecimais corretos. Não pedir à IA que redesenhe a marca.

### 12.2 Texto de briefing

> **Marca: Personal Josy.** Aplicativo de agenda e gestão para personal trainers; não é a marca de um serviço pessoal de treinamento. Descritor opcional e exato: “Agenda e gestão para personal trainers.” Personalidade profissional, organizada e acolhedora, com energia controlada.
>
> Símbolo oficial: calendário amarelo plano com duas presilhas brancas e J em recorte transparente. Aplicar o arquivo fornecido, sem redesenhar. Não usar o antigo monograma PJ. O J deve mostrar o fundo real, sem pintura preta ou letra sobreposta.
>
> Paleta: amarelo #FFD700, branco #FFFFFF e escuro #0D0D0D. O descritor usa cinza-claro #E0E0E0. Neutros de apoio: #1A1A1A, #2A2A2A e #A0A0A0. Nada de ouro metálico, neon, sombra, 3D ou degradê no logo.
>
> Na assinatura, Personal é branco e Josy é amarelo. Usar os vetores aprovados em Poppins SemiBold; o descritor está em Poppins Regular. Manter proporções, espaçamentos e nome em uma linha, inclusive nas composições empilhadas.
>
> Compor com respiro, alinhamentos claros e poucos elementos. Reservar espaço para aplicar a marca posteriormente. Para perfil, usar o avatar fornecido; para header, horizontal sem descritor. Para apresentação pública, considerar as composições com descritor se houver legibilidade.
>
> Não inventar dados de alunos, resultados, funcionalidades, rosto da Josy ou endosso de terceiros. Conteúdo gerado é material de comunicação ou conceito, não produto implementado nem novo arquivo mestre.

## 13. Checklist de aplicação

- O arquivo vem do kit atual, e não do monograma ou de uma prévia histórica?
- A composição escolhida corresponde ao espaço e à finalidade?
- Personal Josy está escrito corretamente e em uma linha?
- Personal é branco, Josy amarelo e o descritor, quando presente, está exato?
- O calendário mantém corpo amarelo, duas presilhas brancas e J realmente transparente?
- A proporção, as curvas e os espaçamentos foram preservados?
- O logo está sem contorno, sombra, efeito ou emblema adicional?
- O amarelo é #FFD700 plano e o fundo final permite leitura?
- Há proteção suficiente e leitura no tamanho efetivo de uso?
- No avatar, o calendário está inteiro após o recorte circular?
- No header, a versão é horizontal, sem descritor e sem sobreposição aos controles?
- Dados, imagens e afirmações estão autorizados e correspondem ao produto real?
- Cores funcionais e assets de terceiros continuam preservados?
- A peça evita tratar uma simulação como se fosse implementação entregue?

## 14. Situação da entrega e próximos trabalhos

| Frente | Situação após esta atualização |
| --- | --- |
| Calendário com J e assinatura principal | Aprovados |
| Escrita e símbolo isolados | Aprovados |
| Empilhada, versões com descritor e avatar | Aprovados |
| Kit de arquivos | Produzido: 14 SVGs e 16 PNGs de marca |
| Guia de identidade | Atualizado por este documento |
| Simulação no header | Aprovada como referência visual |
| Aplicação no app e testes responsivos | Pendentes |
| Sincronização das especificações do projeto | Pendente; repositório não editado |
| Posts, status e modelos finais de campanha | A desenvolver com a arte-final |
| Fonte Poppins no restante da interface | Adoção técnica e testes pendentes |
| Cores invertidas, monocromia e novos fundos | Não aprovados automaticamente |
| Favicon, ícone de instalação e assets PWA | Fora do escopo desta entrega |
| Impressão, bordado e equivalência CMYK | Não homologados |
| Registro de marca e verificações legais | Não realizados por este guia |

A identidade não altera identificadores técnicos, credenciais, domínios, coleções de dados ou regras de negócio. O identificador `app_origin = corepersonal`, citado no guia anterior, não recebeu qualquer alteração aqui. Privacidade, suporte e integrações continuam sendo frentes próprias.

### Base e rastreabilidade

- Guia de identidade anterior fornecido pelo responsável, criado em 15 de outubro de 2026 e atualizado em 16 de outubro de 2026.
- Aprovações nesta conversa da direção calendário com J, da arte-final e das versões complementares.
- Kit completo aprovado, incluindo SVGs, PNGs, manifesto e orientações de uso; nomes, dimensões, cores e estrutura dos vetores conferidos nesta atualização.
- Print do aplicativo e simulação de header já aprovada, usados como referência visual, não como prova de implementação.
- Procedência tipográfica registrada nos metadados e documentos do kit. Os registros de fontes e acessibilidade citados no guia anterior são referências históricas, sem nova consulta externa nesta atualização.

**Regra de manutenção:** quando houver nova decisão de marca, atualizar este guia, o kit afetado e as especificações correspondentes de forma coordenada. Registrar o que foi aprovado e o que foi apenas recomendado, sem apresentar uma proposta ou uma simulação como alteração já implementada.
