// Roda no contexto da página (MAIN world). Quando o content script liga a flag
// data-wt-capture, o próximo play() de áudio é interceptado: o áudio toca mudo,
// é pausado na hora e os bytes (já decifrados pelo WhatsApp) vão pro content script.
//
// Proteção contra áudio tocando sozinho ao abrir uma conversa:
// - play() logo depois de um clique de verdade do usuário (isTrusted) num balão de áudio
//   nunca é capturado nem bloqueado: toca normalmente. O clique que abre a conversa não conta
//   (ele fica fora dos balões), nem o clique automático da transcrição (não é isTrusted).
// - O WhatsApp às vezes chama play() mais de uma vez para o mesmo áudio (aquecimento, áudio
//   ainda baixando). Por isso, durante a captura e alguns segundos depois dela, qualquer play()
//   de áudio sem gesto do usuário também toca mudo e é pausado na hora.
(() => {
  const root = document.documentElement;
  const origPlay = HTMLMediaElement.prototype.play;
  const GUARD_MS = 4000;
  let guardUntil = 0;

  // último clique/tecla de verdade do usuário num balão de áudio da conversa
  const AUDIO_UI = '[data-icon="audio-play"],[data-icon="ptt-play"],[data-icon="ptt-status-play"],[data-icon="audio-pause"],[data-icon="ptt-pause"]';
  let lastUserAudioAction = 0;
  const onUserAction = (e) => {
    if (!e.isTrusted || !(e.target instanceof Element)) return;
    if (e.target.closest(".wt-box")) return; // botões da própria extensão ("Transcrever", "ver tudo")
    const msg = e.target.closest("#main [data-id]");
    if (e.target.closest(AUDIO_UI) || (msg && msg.querySelector(AUDIO_UI))) lastUserAudioAction = Date.now();
  };
  document.addEventListener("pointerdown", onUserAction, true);
  document.addEventListener("click", onUserAction, true);
  document.addEventListener("keydown", onUserAction, true);
  const userGesture = () => Date.now() - lastUserAudioAction < 1500;

  // toca mudo e pausa assim que o play() resolve (mantém os eventos que o WhatsApp espera)
  function silentPlay(el, args) {
    const prevMuted = el.muted;
    el.muted = true;
    const p = origPlay.apply(el, args);
    Promise.resolve(p)
      .then(() => { el.pause(); el.currentTime = 0; })
      .catch(() => {})
      .finally(() => { el.muted = prevMuted; });
    return p;
  }

  HTMLMediaElement.prototype.play = function (...args) {
    const id = root.dataset.wtCapture;
    const src = this.currentSrc || this.src;
    const isAudio = this.tagName === "AUDIO";
    // clique de verdade do usuário: sempre toca, e encerra a janela de proteção
    if (!isAudio || userGesture()) {
      if (isAudio) guardUntil = 0;
      return origPlay.apply(this, args);
    }
    // Na primeira interação da página o WhatsApp dá play() em elementos de mídia sem
    // fonte (para destravar o áudio do navegador). Esses passam direto. Áudios de voz
    // vêm de blob:; data: e outras fontes não são capturados.
    if (id && src && /^blob:/.test(src)) {
      delete root.dataset.wtCapture;
      guardUntil = Date.now() + GUARD_MS;
      fetch(src).then((r) => r.blob())
        .then((b) => b.arrayBuffer().then((buf) =>
          window.postMessage({ __wt: "audio", id, mime: b.type || "audio/ogg", buf }, "*", [buf])))
        .catch((e) => window.postMessage({ __wt: "error", id, msg: String(e && e.message || e) }, "*"))
        .finally(() => { guardUntil = Date.now() + GUARD_MS; });
      return silentPlay(this, args);
    }
    // segundo play() do mesmo áudio (ou de outro) logo depois de uma captura, sem gesto: mudo
    if (src && (id || Date.now() < guardUntil)) return silentPlay(this, args);
    return origPlay.apply(this, args);
  };
})();

// ---------- tema: troca verdes por roxo ----------
// Roda aqui (contexto da página) porque o content script não enxerga todas as
// folhas de estilo do WhatsApp. Só age com o tema ligado (html.wt-neon).
setInterval(() => { if (document.documentElement.classList.contains("wt-neon")) recolor(); }, 700);

// O WhatsApp define dezenas de variáveis de cor com nomes gerados (mudam a cada
// versão). Em vez de listar na mão, lemos as folhas de estilo e recriamos as
// verdes em roxo e os cinzas escuros com um toque de roxo, mantendo o brilho.
// O WhatsApp injeta regras novas nas MESMAS folhas ao longo do uso (stylex),
// então o gatilho é o total de regras, não o número de folhas.
let recolorSig = -1;
function recolor() {
  let sig = 0;
  for (const sh of document.styleSheets) {
    try { sig += sh.cssRules.length; } catch {}
  }
  const hue = +(document.documentElement.dataset.wtHue || 282);
  const neutral = !!document.documentElement.dataset.wtNeutral; // tema Bullet: cinzas sem matiz
  sig = sig + "|" + hue + "|" + neutral; // trocar a cor do tema também refaz
  if (sig === recolorSig) return;
  recolorSig = sig;
  // 1) todos os nomes de variável, inclusive dentro de @media
  const names = new Set();
  const walk = (list) => {
    for (const r of list) {
      if (r.cssRules && !r.style) walk(r.cssRules);
      else if (r.style) for (const p of r.style) if (p.startsWith("--") && !p.startsWith("--wt-")) names.add(p);
    }
  };
  for (const sh of document.styleSheets) {
    if (sh.ownerNode && sh.ownerNode.id === "wt-recolor") continue;
    try { walk(sh.cssRules); } catch {}
  }

  // 2) o valor que está valendo de fato (o mesmo nome é definido por vários
  //    temas), lido sem a nossa troca aplicada
  let st = document.getElementById("wt-recolor");
  if (!st) {
    st = document.createElement("style");
    st.id = "wt-recolor";
    (document.head || document.documentElement).appendChild(st);
  }
  st.textContent = "";
  const cs = getComputedStyle(document.body || document.documentElement);

  const lines = [];
  for (const p of names) {
    const c = parseColor(cs.getPropertyValue(p));
    if (!c) continue;
    const { h, s, l } = toHsl(c);
    let out = null;
    if (s > 0.2 && h >= 75 && h <= 185) out = fromHsl(hue, Math.min(1, s * 1.05), l, c.a);          // verdes/teal
    else if (s < 0.12 && l < 0.22) out = fromHsl(hue, neutral ? 0 : 0.42, Math.max(l, neutral ? 0.027 : 0.03), c.a);                 // cinzas escuros
    if (out) lines.push(`${p}:${out} !important;`);
  }
  // html e body: o WhatsApp redefine as variáveis no body (tema escuro)
  st.textContent = `html.wt-neon, html.wt-neon body{${lines.join("")}}`;
}

function parseColor(v) {
  v = (v || "").trim();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let x = m[1];
    if (x.length === 3) x = x.split("").map((ch) => ch + ch).join("");
    return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: null };
  }
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] ?? null } : null;
}

function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function fromHsl(h, s, l, a) {
  const k = (n) => (n + h / 30) % 12, q = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - q * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  const [r, g, b] = [f(0), f(8), f(4)];
  return a !== null ? `rgba(${r}, ${g}, ${b}, ${a})` : "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

