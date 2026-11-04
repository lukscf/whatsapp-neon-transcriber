# Ficha da Chrome Web Store: WP Neon

Tudo pronto para copiar e colar no painel de desenvolvedor.
Pasta do projeto: `C:\Users\luksc\Downloads\whatsapp-neon-transcriber`

---

## 0. Antes de começar (aba **Conta**)
- Confira se o **e-mail de contato** está preenchido e **verificado**. Sem isso, o botão de envio não libera.

## 1. Criar o item
1. No painel, clique em **+ Novo item**.
2. Envie o arquivo **`dist\wp-neon-2.2.0.zip`**.

---

## 2. Aba **Ficha da loja**

**Descrição**

```
Leia os áudios do WhatsApp Web sem dar play, e deixe a tela com cara de neon.

O WP Neon transcreve automaticamente cada áudio que você recebe no WhatsApp Web e mostra o texto logo abaixo do áudio. É ideal para quando você está em reunião, assistindo um vídeo ou num lugar barulhento.

🔒 NADA SAI DO SEU COMPUTADOR
A transcrição é feita pelo Whisper (modelo de reconhecimento de voz de código aberto) rodando dentro do próprio Chrome. Nenhum áudio, mensagem ou contato é enviado para servidor algum. Não há conta, rastreamento, anúncio nem telemetria. As transcrições ficam só no seu navegador e são apagadas sozinhas depois de 31 dias, ou na hora, pelo botão "Apagar transcrições salvas".

🎙️ TRANSCRIÇÃO
• Automática para os áudios recebidos (os seus não são transcritos)
• Em português, grátis e sem chave de API
• Três modelos: small (melhor em português), base e tiny (mais rápidos)
• O texto aparece digitando; áudio longo mostra 3 linhas e um "ver tudo"
• Transcrições guardadas por 1 mês: reabrir o WhatsApp não transcreve tudo de novo

🎨 VISUAL NEON
• Tema escuro em 7 cores: roxo, azul, rosa, vermelho, laranja, ciano e matrix
• O ícone da extensão acompanha a cor escolhida
• Efeito 3D: os balões inclinam na direção do mouse e as imagens seguem o cursor
• Fontes: padrão, Mono robot (Roboto Mono) ou Arial

✨ EFEITOS
• 10 fundos animados: estrelas, grade synthwave, chuva matrix, aurora boreal, bolhas de luz, hiperespaço, ondas de luz, constelação (reage ao mouse), chuva neon e vaga-lumes
• Formato do balão: arredondado, quadrado ou terminal
• Vidro no topo e na caixa de mensagem, luz que segue o mouse, bordas neon, mensagem nova acendendo, áudio pulsando enquanto toca e conversas não lidas pulsando
• Lista de conversas compacta
• Modo discreto (Alt+P): borra fotos e nomes para compartilhar a tela; as mensagens continuam legíveis

Tudo liga e desliga no ícone da extensão e muda na hora.

⚠️ Para ler o áudio, a extensão dá um play mudo, então quem mandou vê o áudio como ouvido. Se preferir, desligue "Transcrever automaticamente" e transcreva só os áudios que escolher.

Código aberto: https://github.com/lukscf/whatsapp-neon-transcriber

WP Neon é um projeto independente, sem relação com o WhatsApp ou a Meta.
```

| Campo | Valor |
|---|---|
| **Categoria** | Comunicação (em Produtividade) |
| **Idioma** | Português (Brasil) |
| **Ícone da loja** (128×128) | `icons\icon128.png` |
| **Capturas de tela** (1280×800) | `store\screenshot-1.png`, `store\screenshot-2.png`, `store\screenshot-3.png` |
| **Bloco promocional pequeno** (440×280) | `store\promo-440x280.png` |
| **URL da página inicial** | `https://github.com/lukscf/whatsapp-neon-transcriber` |
| **URL de suporte** | `https://github.com/lukscf/whatsapp-neon-transcriber/issues` |
| Conteúdo adulto | Não |

---

## 3. Aba **Práticas de privacidade**

**Finalidade única**

```
Transcrever localmente os áudios recebidos no WhatsApp Web e personalizar a aparência do WhatsApp Web (tema, cores e efeitos visuais).
```

**Justificativa de cada permissão**

| Permissão | Justificativa (colar) |
|---|---|
| `storage` | `Guardar as configurações da extensão (tema, cor, fonte, efeitos) e as transcrições dos áudios no próprio navegador, por até 31 dias.` |
| `unlimitedStorage` | `As transcrições de um mês podem passar do limite padrão de armazenamento local. Tudo fica só no navegador do usuário.` |
| `offscreen` | `Um documento offscreen decodifica o áudio (AudioContext) e hospeda o worker que roda o modelo Whisper localmente, fora da página do WhatsApp.` |
| Permissão de host (`https://web.whatsapp.com/*`) | `A extensão só funciona no WhatsApp Web: lê os áudios recebidos para transcrever e aplica o tema e os efeitos visuais na página.` |

**Você está usando código remoto?** → **Não, não estou usando código remoto**
(Todo o JavaScript e o WebAssembly estão no pacote. Do Hugging Face só vêm os pesos do modelo Whisper, que são dados, não código.)

**Uso de dados**

Marque:
- [x] **Comunicações pessoais**: a extensão processa os áudios das conversas para transcrever.
- [x] **Conteúdo do site**: a extensão lê a página do WhatsApp Web para mostrar a transcrição e aplicar o tema.

Marque as 3 declarações:
- [x] Não vendo ou transfiro dados do usuário a terceiros, fora dos casos de uso aprovados
- [x] Não uso nem transfiro dados do usuário para fins não relacionados à finalidade única do item
- [x] Não uso nem transfiro dados do usuário para determinar a capacidade de crédito ou para fins de empréstimo

**URL da política de privacidade**

```
https://github.com/lukscf/whatsapp-neon-transcriber/blob/main/docs/PRIVACIDADE.md
```

---

## 4. Aba **Distribuição**
- Pagamentos: **Gratuito**
- Visibilidade: **Público** (ou **Não listado**, se quiser que só quem tem o link encontre)
- Regiões: **Todas as regiões**

---

## 5. Enviar
1. Clique em **Enviar para análise**.
2. Pode deixar marcado para **publicar automaticamente** depois da aprovação.

A análise costuma levar de alguns dias a 1–2 semanas.

## 6. Link para compartilhar
Depois de criar o item, o painel mostra o **ID do item** (32 letras). O link da loja é:

```
https://chromewebstore.google.com/detail/<ID-DO-ITEM>
```

Ele só abre para o público **depois da aprovação**. Até lá, o pessoal pode instalar pelo GitHub
(instruções no README).
