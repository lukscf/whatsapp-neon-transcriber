# Arquitetura

A extensão tem três partes: o que roda **na página do WhatsApp**, o que roda **por trás**
(service worker e documento offscreen) e o **popup**.

```
 WhatsApp Web (aba)                         Extensão (por trás)
┌──────────────────────────────┐          ┌─────────────────────────────────────┐
│ inject.js  (mundo da página) │          │ background.js (service worker)      │
│  • intercepta play() do áudio│          │  • recebe o áudio, garante o        │
│  • recolore as variáveis CSS │          │    documento offscreen              │
│                              │          │  • pinta o ícone na cor do tema     │
│ content.js (isolado)         │ runtime  │                                     │
│  • acha áudios, fila         │ ───────► │ offscreen.html / offscreen.js       │
│  • caixa da transcrição      │ ◄─────── │  • decodifica ogg/opus → 16 kHz     │
│  • 3D, cor, fonte            │          │                                     │
│                              │          │ whisper-worker.js (Web Worker)      │
│ fx.js (isolado)              │          │  • transformers.js + ONNX (WASM)    │
│  • fundos, vidro, bordas,    │          │  • roda o Whisper                   │
│    modo discreto, etc.       │          └─────────────────────────────────────┘
└──────────────────────────────┘
               ▲  chrome.storage.local (configurações e transcrições)
               └──────────────── popup.html / popup.js
```

## Caminho de uma transcrição

1. **Achar o áudio** (`content.js`): a cada mudança na tela, varre `#main [data-id]` (cada
   mensagem) procurando o botão `Reproduzir mensagem de voz`. Áudio enviado por você é pulado,
   identificado pelo "rabinho" do balão (`data-icon="tail-out"`) ou pela posição na tela.
2. **Pegar os bytes** (`content.js` + `inject.js`): o content script liga a marca
   `data-wt-capture` no `<html>` e clica no play. O `inject.js`, que roda no mundo da página e
   substituiu `HTMLMediaElement.prototype.play`, vê a marca, deixa o áudio mudo, pausa na hora,
   lê o `blob:` já decifrado pelo WhatsApp e devolve os bytes por `postMessage`.
3. **Mandar para o Whisper** (`background.js`): o áudio vai em base64 para o service worker,
   que cria o documento offscreen se ainda não existir.
4. **Decodificar** (`offscreen.js`): `AudioContext({ sampleRate: 16000 })` converte o
   ogg/opus em `Float32Array` mono de 16 kHz, o formato que o Whisper espera.
5. **Transcrever** (`whisper-worker.js`): o worker carrega o pipeline
   `automatic-speech-recognition` do transformers.js (WASM, quantizado `q8`, 1 thread) e
   transcreve em pedaços de 30 s.
6. **Mostrar e guardar** (`content.js`): o texto vai para a caixa abaixo do áudio e para
   `chrome.storage.local` em `wt_cache`, como `{ data-id: { t: texto, at: data } }`.
   Entradas com mais de 31 dias são apagadas ao carregar e ao salvar.

### Por que um worker
As páginas de uma extensão (popup, offscreen) dividem o mesmo processo. Se o Whisper rodasse na
thread do offscreen, o popup travaria durante cada transcrição. No worker, ele roda em paralelo.

### Por que o WebGPU fica escondido
A extensão usa só WASM. O worker esconde `navigator.gpu` antes de carregar o transformers.js,
para ele não chamar `requestAdapter()`. Essa chamada gerava um aviso do Chrome no Windows.

## Tema e cores

- `content.js` calcula a paleta a partir do **matiz** da cor escolhida e grava em variáveis
  `--wt-*` no `<html>`. Também grava o matiz em `data-wt-hue`.
- `theme.css` aponta as variáveis conhecidas do WhatsApp para a paleta `--wt-*`. Isso inclui as do
  `#main`, onde o WhatsApp guarda a cor escolhida para cada conversa.
- `inject.js` resolve o resto: o WhatsApp tem **milhares** de variáveis de cor com nomes gerados,
  que mudam a cada versão. A cada 700 ms, se o número de regras CSS mudou, ele lê o valor **em
  uso** de cada variável e recria em `<style id="wt-recolor">`:
  - verdes e azul-esverdeados (matiz 75–185) → matiz do tema, mantendo o brilho;
  - cinzas escuros → um tom escuro do matiz do tema.

  Isso precisa rodar no mundo da página, porque o content script não enxerga todas as folhas de
  estilo.
- O **ícone** é desenhado em `background.js` com `OffscreenCanvas`, no matiz do tema, via
  `chrome.action.setIcon`. Os PNGs de `icons/` são o ícone padrão (roxo).

## Efeitos (`fx.js` + `fx.css`)

Cada efeito é uma classe no `<html>` (`wt-bgfx`, `wt-glass`, `wt-borders`, `wt-privacy`…),
ligada pelas chaves do `chrome.storage.local`.

- **Fundo animado:** um `<canvas id="wt-bg">` dentro do `#main`, com `z-index: -1` e
  `isolation: isolate` no `#main`. Fica acima do fundo do painel e abaixo das mensagens. A camada
  de papel de parede do WhatsApp recebe `.wt-wall` e fica invisível. As cenas ficam no objeto
  `SCENES`, rodam a 30 fps (Matrix a 18) e param quando a aba está escondida.
- **Balão:** `surface(row)` é o primeiro `div` com fundo pintado dentro da mensagem. Recebe
  `.wt-bubble` e um `<span class="wt-border">` para a borda animada (`@property --wt-ang`).
- **3D** (`content.js`): o balão sob o mouse recebe `transform: perspective() rotateX/Y`.
  Imagens (`<img>` ≥ 120 px na mensagem) seguem o mouse sempre. Na lista lateral, a linha já usa
  `transform` para se posicionar, então quem inclina é o filho.
- **Modo discreto:** marca com `.wt-pv` só fotos (imagens < 60 px que não são emoji) e nomes
  (`[data-testid="author"]`, nome da lista, topo da conversa). `Alt+P` alterna.
- O WhatsApp **redesenha balões** de vez em quando. Os caches (`surfaceOf`, `bubbleOf`) conferem
  se o elemento guardado ainda está na tela antes de usar.

## Quando o WhatsApp muda

O WhatsApp Web muda o HTML com frequência. Os pontos que dependem dele:

| Peça | Arquivo | Seletor/sinal atual |
|---|---|---|
| Mensagem | `content.js`, `fx.js` | `#main [data-id]` (sem `[data-id]` dentro) |
| Botão de play do áudio | `content.js` → `PLAY_SEL` | `button[aria-label="Reproduzir mensagem de voz"]` |
| Áudio tocando | `fx.js` | `button[aria-label^="Pausar"]` |
| Enviada × recebida | `content.js` → `isOutgoing` | `[data-icon="tail-out"]` / posição |
| Autor em grupo | `fx.js` → `markPrivate` | `[data-testid="author"]` |
| Não lida | `fx.js` | `[aria-label*="não lida"]` |
| Lista de conversas | `fx.js`, `content.js` | `#pane-side [role="row"]` |
| Cor da conversa | `theme.css` | variáveis `--WDS-systems-bubble-*` no `#main` |

Para investigar, abra o DevTools no WhatsApp Web e confira se esses seletores ainda acham algo.

## Configurações (`chrome.storage.local`)

| Chave | Padrão | Uso |
|---|---|---|
| `localModel` | `Xenova/whisper-small` | modelo Whisper |
| `language` | `pt` | idioma (vazio = detectar) |
| `auto` | `true` | transcrever sozinho |
| `theme` | `true` | tema dark neon |
| `preset` | `roxo` | cor do tema |
| `font` | `padrao` | `padrao`, `mono`, `arial` |
| `fx3d` | `true` | efeito 3D |
| `typefx` | `true` | transcrição digitando |
| `bgfx` | `estrelas` | fundo animado (`nenhum` desliga) |
| `shape` | `padrao` | formato do balão |
| `glass`, `glow`, `enterfx`, `borders`, `wavefx`, `unreadfx` | `true` | efeitos |
| `compact`, `privacy` | `false` | lista compacta, modo discreto |
| `wt_cache` | — | transcrições salvas (31 dias) |

## Permissões

| Permissão | Por quê |
|---|---|
| `storage`, `unlimitedStorage` | configurações e transcrições, sem o limite de 10 MB |
| `offscreen` | documento que decodifica o áudio e hospeda o worker do Whisper |
| `https://web.whatsapp.com/*` | rodar na página do WhatsApp Web |
| CSP `'wasm-unsafe-eval'` | permitir o WebAssembly do ONNX Runtime |
