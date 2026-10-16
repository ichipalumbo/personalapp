# Personal Josy — arte-final vetorial para validação

## Escopo
Consolidação da direção calendário + J aprovada na conversa. O monograma PJ anterior não é o símbolo desta entrega. O antigo guia continua sendo referência de cores e tipografia, mas sua seção de integridade do monograma não descreve este novo símbolo.

## O que foi finalizado
- Símbolo redesenhado com curvas regulares, duas presilhas brancas e corpo amarelo.
- O J é um recorte geométrico transparente, e não uma letra preta sobreposta.
- Assinatura Personal Josy com os contornos reais de Poppins SemiBold, peso 600, convertidos em caminhos vetoriais. Não há texto editável, dependência de fonte instalada ou imagem raster dentro dos SVGs.
- Ajustes ópticos de espaçamento; por isso o nome não deve ser recriado apenas digitando as palavras e esperando a mesma composição.
- Versão horizontal, somente o símbolo e somente a escrita; cada uma em fundo transparente e fundo escuro, nos formatos SVG e PNG.

## Tipografia e procedência
Fonte: Poppins SemiBold 4.003, glifos e métricas consultados no TTX oficial publicado pela Indian Type Foundry. Não é uma aproximação de fonte produzida por gerador de imagens. Os pontos quadráticos originais foram convertidos em caminhos SVG, com escala uniforme.
Copyright 2014-2019 Indian Type Foundry.
Licença da fonte: SIL Open Font License 1.1. Nenhum arquivo de fonte é redistribuído neste conjunto.
Fonte consultada: https://raw.githubusercontent.com/itfoundry/Poppins/master/products/Poppins-4.003-GoogleFonts-TTF/Poppins-SemiBold.ttx
Licença: https://raw.githubusercontent.com/itfoundry/Poppins/master/OFL.txt

## Cores
- Amarelo: #FFD700
- Branco: #FFFFFF
- Base escura: #0D0D0D
Os PNGs têm suavização nas bordas. Os preenchimentos mestres dos vetores usam as cores exatas acima.

## Uso no header
- Preferir a versão horizontal transparente sobre o fundo escuro existente.
- Nome completo, em uma linha, sem descritor e sem sombra.
- Dimensões intrínsecas do SVG indicam proporção, não uma exigência de largura no aplicativo.
- Não definir largura e altura independentes que distorçam a marca.
- Na simulação, o desenho mede cerca de 308 × 49 pixels do print e foi posicionado a partir de x=34 e y=47. Essas são coordenadas do bitmap enviado, NÃO valores CSS nem medidas confirmadas do aparelho.
- A simulação substitui apenas a região visual do título e preserva o botão à direita. Não implementa código, layout responsivo ou alterações na família de fontes do restante da interface.
- O arquivo de simulação contém apenas o header, sem informações de alunos.

## Respiro e redução — recomendações iniciais
- O arquivo do logo tem enquadramento compacto. Reservar o respiro na própria composição/interface.
- Como ponto de partida, deixar ao menos 1/4 da largura do símbolo livre em torno do conjunto (aproximadamente 56 unidades do mestre).
- Conferir o nome e o J em tamanho real; o print isolado não homologa uma dimensão mínima.
- O SVG já tem acessibilidade descritiva interna; ao usar como imagem no app, definir o nome acessível de acordo com o contexto e evitar duplicação com texto visível.

## Aplicação em fundos claros
As versões transparentes preservam letras e presilhas brancas. Não foram adaptadas para aplicação direta em branco. Em um material claro, usar a variante com base escura ou aprovar uma composição apropriada. Não inverter cores automaticamente.

## Status
Geometria vetorial consolidada para validação visual. O aplicativo NÃO foi alterado. Não houve teste em DOM, aprovação de marca registrada ou produção de campanhas. Versões empilhada e com descritor ficam para a etapa de derivações depois da aprovação desta base.
