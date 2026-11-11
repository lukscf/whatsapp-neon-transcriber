# Histórico

## 2.3.1
- **Áudio não toca mais sozinho ao abrir uma conversa.** Para transcrever, a extensão aperta o play do áudio sem som e pausa. O WhatsApp às vezes chamava o play uma segunda vez (áudio ainda baixando) e esse segundo play saía com som.
  - Agora, durante a captura e alguns segundos depois, todo play sem clique seu num balão de áudio fica mudo e é pausado.
  - Play que você mesmo dá num áudio continua tocando normalmente.
  - A captura só pega áudios de voz (blob:).

## 2.3.0
- **Tema Bullet**: paleta, tipografia e movimento do Bullet Identity Source. Fundo quase preto, superfícies em degraus de cinza, texto branco e off-white, Open Sans e acento lime só em detalhe; os verdes do WhatsApp viram lime e os cinzas ficam neutros. Escolher Bullet no popup liga junto o fundo novo, e o ícone da barra fica preto com fio lime.
- **Fundo "Bullet: balas e cripto"**: balas com rastro cruzando a conversa, moedas cripto girando (₿, Ξ, ₮, $, ◎, Ł) e uma linha de preço discreta, sobre textura de ruído. Pausa com a aba escondida e respeita "reduzir movimento".
- **Fonte**: nova opção Open Sans (licença OFL), além de Roboto Mono e Arial.

## 2.2.1
- Correção: a primeira transcrição depois de abrir o WhatsApp Web dava erro e só a segunda funcionava. Três causas tratadas:
  - a captura pegava o primeiro `play()` da página, que o WhatsApp usa sem áudio para destravar o som. Agora ela espera o áudio de verdade;
  - o documento offscreen recém-criado ainda não ouvia mensagens. O service worker agora espera ele ficar pronto;
  - se algo ainda falhar na primeira vez (extensão acordando, modelo carregando), a transcrição tenta de novo sozinha antes de mostrar o erro.

## 2.1.0
- 7 fundos animados novos: Aurora boreal, Bolhas de luz, Hiperespaço, Ondas de luz, Constelação, Chuva neon e Vaga-lumes.
- Modo discreto borra só fotos e nomes, inclusive o autor das mensagens em grupo. Emojis ficam de fora.
- Aviso de privacidade no popup e botão para apagar as transcrições salvas.
- Correção: balões redesenhados pelo WhatsApp perdiam a borda neon e o 3D.

## 2.0.0
- Efeitos: fundo animado (Estrelas, Synthwave, Matrix), vidro, luz que segue o mouse, animação de mensagem nova, bordas neon, formato do balão, áudio pulsando, não lidas pulsando, lista compacta e modo discreto (`Alt+P`).
- Transcrição aparece digitando. Áudio longo mostra 3 linhas e um "ver tudo".

## 1.6.0
- Whisper roda num Web Worker: o popup não trava mais durante a transcrição.
- WebGPU escondido do transformers.js, sem o aviso de `powerPreference`.

## 1.5.0
- Ícone acompanha a cor do tema.
- Removidas a OpenAI e a cor personalizada. A transcrição é só local.

## 1.3.0 – 1.4.0
- Efeito 3D que segue o mouse, temas de cor e fontes.
- Ícone WP.
- O tema também passa por cima da cor que o WhatsApp guarda para cada conversa.

## 1.2.0
- Transcrições guardadas por 31 dias. Correção: o cache era lido depois da primeira varredura e tudo era transcrito de novo.

## 1.1.0
- Whisper local gratuito (transformers.js). Tema recolore todos os verdes do WhatsApp. Só áudios recebidos são transcritos.

## 1.0.0
- Primeira versão: transcrição de áudio e tema dark roxo neon.
