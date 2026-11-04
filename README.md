<p align="center">
  <img src="icons/icon128.png" width="96" alt="WP">
</p>

<h1 align="center">WP Neon – Transcrição de áudio para WhatsApp Web</h1>

<p align="center">
  Extensão do Chrome que <b>transcreve os áudios do WhatsApp Web dentro do seu computador</b>
  e deixa a tela com um visual dark neon: temas de cor, fundos animados, efeito 3D e modo discreto.
</p>

---

## O que ela faz

### Transcrição de áudio
- Transcreve **automaticamente** os áudios que você **recebe**. Os que você manda não são transcritos.
- O texto aparece numa caixa logo abaixo do áudio.
- Usa o **Whisper** (modelo de reconhecimento de voz da OpenAI, código aberto) rodando **localmente** no Chrome.
  Não tem custo, não precisa de chave e **o áudio nunca sai do seu computador**.
- Três tamanhos de modelo: `small` (melhor em português, ~250 MB), `base` (~80 MB) e `tiny` (~40 MB).
  O modelo é baixado uma vez e fica guardado no Chrome.
- As transcrições ficam salvas **por 1 mês**: reabrir o WhatsApp não transcreve tudo de novo.
- Áudio longo mostra 3 linhas e um "ver tudo".
- Quando a transcrição fica pronta, o texto aparece **digitando**.
- Com o automático desligado, cada áudio ganha um botão **✦ Transcrever**.

### Aparência
| Opção | O que faz |
|---|---|
| **Tema dark neon** | Troca todas as cores do WhatsApp por um tema escuro neon, inclusive a cor que o WhatsApp guarda para cada conversa. |
| **Cor do tema** | Roxo, Azul, Rosa, Vermelho, Laranja, Ciano ou Matrix. O ícone da extensão acompanha a cor. |
| **Fonte** | Padrão do WhatsApp, Mono robot (Roboto Mono) ou Arial. |
| **Efeito 3D** | O balão sob o mouse inclina na direção dele. Fotos e imagens seguem o mouse o tempo todo. |

### Efeitos
| Opção | O que faz |
|---|---|
| **Fundo animado** | Estrelas, Grade synthwave, Chuva Matrix, Aurora boreal, Bolhas de luz, Hiperespaço, Ondas de luz, Constelação (reage ao mouse), Chuva neon, Vaga-lumes ou nenhum. |
| **Formato do balão** | Padrão, Arredondado, Quadrado ou Terminal (fonte mono e `>` antes de cada mensagem). |
| **Vidro** | Topo da conversa e caixa de mensagem translúcidos, com o fundo borrado por trás. |
| **Luz que segue o mouse** | Brilho suave na cor do tema acompanhando o cursor. |
| **Mensagem nova** | Entra deslizando e acende em neon. |
| **Bordas neon** | Uma luz percorre a borda de cada balão. |
| **Áudio pulsando** | O balão pulsa e as ondas brilham enquanto o áudio toca. |
| **Não lidas pulsando** | Barra de luz pulsando ao lado das conversas não lidas. |
| **Lista compacta** | Lista de conversas menor, para caber mais. |
| **Modo discreto** | Borra fotos e nomes (lista, topo da conversa e autor das mensagens em grupo). As mensagens continuam legíveis. Passar o mouse revela. **Atalho: `Alt+P`.** |

Tudo liga e desliga no popup da extensão e muda na hora.

---

## Privacidade

- **Nada sai do seu computador.** A transcrição roda no próprio Chrome. Nenhum áudio, mensagem,
  contato ou transcrição é enviado para servidor algum.
- **Sem conta, sem rastreamento, sem anúncio, sem telemetria.**
- As transcrições ficam só no armazenamento local da extensão neste Chrome e **são apagadas sozinhas depois de 31 dias**.
  O botão **"Apagar transcrições salvas agora"** no popup apaga tudo na hora.
- **Única conexão externa:** o download do modelo Whisper, uma vez, de `huggingface.co`.

Detalhes em [docs/PRIVACIDADE.md](docs/PRIVACIDADE.md).

> ⚠️ **Áudio recebido aparece como ouvido.** Para ler o áudio, a extensão dá um play mudo e pausa
> na hora. Por isso quem mandou vê o microfone azul. Se não quiser isso, desligue
> **Transcrever automaticamente** e use o botão **✦ Transcrever** só nos áudios que escolher.

---

## Instalação

1. Baixe este repositório (**Code → Download ZIP**) e descompacte, ou clone:
   ```bash
   git clone https://github.com/lukscf/whatsapp-neon-transcriber.git
   ```
2. No Chrome, abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e escolha a pasta do projeto.
5. Abra (ou recarregue) o [WhatsApp Web](https://web.whatsapp.com).
6. Opcional: no ícone **WP**, escolha o modelo e clique em **Salvar** para já baixar o modelo.
   Senão ele é baixado no primeiro áudio.

### Atualizar
Depois de mudar qualquer arquivo: em `chrome://extensions`, clique em **↻** no card da extensão
e recarregue o WhatsApp Web.

---

## Uso

| Onde | O quê |
|---|---|
| Ícone **WP** na barra do Chrome | Abre as configurações: transcrição, aparência, efeitos e privacidade. |
| Embaixo de cada áudio recebido | Caixa com a transcrição (ou o botão **✦ Transcrever**). |
| `Alt+P` no WhatsApp Web | Liga e desliga o modo discreto. Um selo no topo da tela mostra quando está ativo. |

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Nenhuma caixa de transcrição aparece | Recarregue a extensão e o WhatsApp Web. Se o WhatsApp mudou o site, os seletores podem precisar de ajuste (veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md#quando-o-whatsapp-muda)). |
| "no available backend found" | O Chrome bloqueou o WebAssembly. Confira se o `manifest.json` tem `'wasm-unsafe-eval'` em `content_security_policy`. |
| Primeira transcrição demora | É o download do modelo. Depois fica rápido. Para ir mais rápido, use o modelo `base` ou `tiny`. |
| Ficou alguma cor verde | O tema recolore as variáveis de cor do WhatsApp em tempo real. Se aparecer cor nova numa versão nova do site, abra uma issue com um print. |
| Popup lento | O Whisper roda num worker separado. Se travar, recarregue a extensão. |

---

## Estrutura

```
manifest.json         configuração da extensão (Manifest V3)
inject.js             roda dentro da página: captura o áudio e recolore o tema
content.js            acha os áudios, fila de transcrição, caixa de texto, 3D, cor e fonte
fx.js / fx.css        efeitos: fundos animados, vidro, bordas, modo discreto etc.
theme.css             tema dark neon e caixa da transcrição
background.js         service worker: fala com o Whisper e pinta o ícone na cor do tema
offscreen.html/.js    decodifica o áudio (AudioContext) e repassa ao worker
whisper-worker.js     roda o Whisper (transformers.js + ONNX/WASM) fora da thread principal
popup.html / popup.js configurações
lib/                  transformers.js e onnxruntime-web (WASM), empacotados
fonts/                Roboto Mono (OFL)
icons/                ícone WP
docs/                 arquitetura e privacidade
```

Como as peças conversam: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

---

## Créditos e licenças

- Código desta extensão: [MIT](LICENSE).
- [transformers.js](https://github.com/huggingface/transformers.js) (Apache-2.0) e
  [onnxruntime-web](https://github.com/microsoft/onnxruntime) (MIT), em `lib/`.
- Modelos [Whisper](https://github.com/openai/whisper) (MIT), versões ONNX do
  [Xenova](https://huggingface.co/Xenova), baixados em tempo de uso.
- Fonte [Roboto Mono](https://github.com/googlefonts/robotomono) (SIL OFL 1.1), em `fonts/`.

Detalhes em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

> Projeto pessoal, sem relação com o WhatsApp ou a Meta. "WhatsApp" é marca dos respectivos donos.
