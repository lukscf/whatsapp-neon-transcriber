# Privacidade

**Resumo: nada sai do seu computador.**

## O que a extensão lê
- Os áudios das conversas abertas no WhatsApp Web, para transcrever.
- A estrutura da página (nomes de classes e atributos), para aplicar o tema e os efeitos.

## Para onde isso vai
- **Para lugar nenhum fora do seu computador.** O áudio é decodificado e transcrito no próprio
  Chrome, num worker da extensão, pelo modelo Whisper rodando em WebAssembly.
- A extensão não tem servidor, conta, telemetria, analytics nem anúncio.
- A extensão **não tem permissão** para acessar outro site além de `web.whatsapp.com`.

## O que fica guardado
| O quê | Onde | Por quanto tempo |
|---|---|---|
| Transcrições (texto + data) | `chrome.storage.local` da extensão, neste Chrome | 31 dias, depois são apagadas sozinhas |
| Configurações (cor, fonte, efeitos) | `chrome.storage.local` | até você remover a extensão |
| Modelo Whisper | cache do navegador (origem da extensão) | até você limpar os dados ou remover a extensão |

Nada é sincronizado com a sua conta Google.

**Apagar tudo:** no popup, clique em **"Apagar transcrições salvas agora"**. Remover a extensão
apaga também as configurações e o modelo.

## Conexão externa
A única é o **download do modelo Whisper**, feito uma vez, de `huggingface.co` (e da CDN dele).
Nenhum dado seu vai nessa requisição: é só o download de um arquivo público.

## Efeito colateral no WhatsApp
Para ler o áudio, a extensão dá **play mudo** e pausa na hora. O WhatsApp entende isso como
"ouvido" e mostra o microfone azul para quem mandou. Com **Transcrever automaticamente**
desligado, isso só acontece nos áudios em que você clicar em **✦ Transcrever**.
