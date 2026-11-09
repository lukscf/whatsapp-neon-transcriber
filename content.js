// Content script: acha as mensagens de voz, captura o áudio, pede a transcrição
// ao service worker e mostra o texto embaixo do balão.
const DEFAULTS = { auto: true, theme: true };
let settings = { ...DEFAULTS };
let cache = {};            // data-id da mensagem -> { t: texto, at: quando transcreveu }
let ready = false;         // só varre depois de carregar o cache salvo
const KEEP_MS = 31 * 24 * 60 * 60 * 1000; // guarda as transcrições por 1 mês
const queued = new Set();  // data-ids na fila ou em andamento
const queue = [];
let busy = false;

const PLAY_SEL = [
  'button[aria-label="Reproduzir mensagem de voz"]', 'button[aria-label="Play voice message"]',
  'button[aria-label^="Reproduzir" i][aria-label*="voz" i]', 'button[aria-label^="Play" i][aria-label*="voice" i]',
  '[data-icon="audio-play"]', '[data-icon="ptt-play"]', '[data-icon="ptt-status-play"]'
].join(",");

// ---------- estado ----------
chrome.storage.local.get(["auto", "theme", "wt_cache"], (s) => {
  settings = { auto: s.auto ?? DEFAULTS.auto, theme: s.theme ?? DEFAULTS.theme };
  cache = s.wt_cache || {};
  // formato antigo guardava só o texto; converte e descarta o que passou de 1 mês
  const now = Date.now();
  for (const [k, v] of Object.entries(cache)) {
    if (typeof v === "string") cache[k] = { t: v, at: now };
    else if (!v || now - v.at > KEEP_MS) delete cache[k];
  }
  ready = true;
  applyTheme();
  scheduleScan();
});

chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  // "Apagar transcrições salvas" no popup: esquece também o que está na memória e na tela
  if (ch.wt_cache && ch.wt_cache.newValue === undefined) {
    cache = {};
    document.querySelectorAll(".wt-box").forEach((b) => b.remove());
  }
  if (ch.auto) settings.auto = ch.auto.newValue;
  if (ch.theme) { settings.theme = ch.theme.newValue; applyTheme(); }
  scheduleScan();
});

function applyTheme() {
  document.documentElement.classList.toggle("wt-neon", !!settings.theme);
}

// ---------- aparência: cor do tema, fonte e efeito 3D ----------
const PRESETS = { roxo: 282, azul: 205, rosa: 322, vermelho: 352, laranja: 24, ciano: 180, matrix: 135 };
const LOOK_KEYS = ["preset", "font", "fx3d", "typefx"];
let look = { preset: "roxo", font: "padrao", fx3d: true, typefx: true };
const freshIds = new Set(); // transcritos agora (animam digitando)

chrome.storage.local.get(LOOK_KEYS, (s) => { look = { ...look, ...strip(s) }; applyLook(); });
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local" || !LOOK_KEYS.some((k) => ch[k])) return;
  for (const k of LOOK_KEYS) if (ch[k]) look[k] = ch[k].newValue;
  applyLook();
});
function strip(o) { return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)); }

function applyLook() {
  const root = document.documentElement;
  const h = PRESETS[look.preset] ?? PRESETS.roxo;
  const pal = {
    bg: `hsl(${h} 50% 4%)`, panel: `hsl(${h} 50% 8%)`, header: `hsl(${h} 50% 11%)`,
    raise: `hsl(${h} 45% 15%)`, in: `hsl(${h} 40% 13%)`, out: `hsl(${h} 70% 24%)`,
    line: `hsl(${h} 45% 20%)`, accent: `hsl(${h} 100% 58%)`, neon: `hsl(${h} 100% 74%)`,
    text: `hsl(${h} 100% 95%)`, sub: `hsl(${h} 30% 70%)`
  };
  for (const [k, v] of Object.entries(pal)) root.style.setProperty("--wt-" + k, v);
  root.dataset.wtHue = String(h); // o inject.js usa pra recolorir as cores do WhatsApp
  root.classList.toggle("wt-font-mono", look.font === "mono");
  root.classList.toggle("wt-font-arial", look.font === "arial");
  root.classList.toggle("wt-3d", !!look.fx3d);
  if (!look.fx3d) resetTilt();
  refreshImages();
}

// Efeito 3D: o balão (ou a conversa da lista) sob o mouse inclina na direção dele.
let tiltEl = null, tiltFrame = 0, lastEv = null;
const bubbleOf = new WeakMap();

function bubbleFor(row) {
  const c = bubbleOf.get(row);
  if (c && c.isConnected && row.contains(c)) return c; // o WhatsApp redesenha o balão às vezes
  // desce pelo filho de maior área até achar o primeiro mais estreito que a linha: é o balão
  const w = row.offsetWidth;
  let e = row;
  for (let i = 0; i < 12 && e; i++) {
    if (e !== row && e.offsetWidth < w * 0.85) break;
    e = [...e.children].sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0];
  }
  const res = e && e !== row ? e : null;
  if (w) bubbleOf.set(row, res);
  return res;
}

function targetFor(node) {
  if (!(node instanceof Element)) return null;
  const msg = node.closest("#main [data-id]");
  if (msg && isImageRow(msg)) return null; // imagem segue o mouse sempre (followImages)
  if (msg) return { el: bubbleFor(msg), max: 12 };
  const item = node.closest('#pane-side [role="row"]');
  // a linha da lista já usa transform pra se posicionar; inclina o filho
  if (item && item.firstElementChild) return { el: item.firstElementChild, max: 7 };
  return null;
}

function resetTilt() {
  if (!tiltEl) return;
  tiltEl.style.transform = "";
  tiltEl.classList.remove("wt-tilting");
  tiltEl = null;
}

function tiltTick() {
  tiltFrame = 0;
  const ev = lastEv;
  followImages(ev);
  const t = targetFor(ev.target);
  if (!t || !t.el) return resetTilt();
  if (t.el !== tiltEl) {
    resetTilt();
    tiltEl = t.el;
    tiltEl.classList.add("wt-tilt", "wt-tilting");
  }
  const r = tiltEl.getBoundingClientRect();
  const dx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width) * 2 - 1));
  const dy = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height) * 2 - 1));
  tiltEl.style.transform =
    `perspective(700px) rotateX(${(-dy * t.max).toFixed(2)}deg) rotateY(${(dx * t.max).toFixed(2)}deg) scale(1.03)`;
}

document.addEventListener("mousemove", (ev) => {
  if (!look.fx3d) return;
  lastEv = ev;
  if (!tiltFrame) tiltFrame = requestAnimationFrame(tiltTick);
}, { passive: true });
document.documentElement.addEventListener("mouseleave", resetTilt);

// Imagens: TODAS as visíveis na conversa olham pro mouse o tempo todo,
// não só quando o mouse está em cima delas.
let imageBubbles = new Set();

function isImageRow(row) {
  for (const img of row.querySelectorAll("img")) {
    if (img.closest("[data-id]") !== row) continue;
    const w = img.getBoundingClientRect().width;
    if (w >= 120 && /^(blob:|data:image|https:)/.test(img.src)) return true; // ignora avatar e emoji
  }
  return false;
}

function refreshImages() {
  const next = new Set();
  if (look.fx3d) {
    document.querySelectorAll("#main [data-id]").forEach((row) => {
      if (row.querySelector("[data-id]") || !isImageRow(row)) return;
      const b = bubbleFor(row);
      if (b) next.add(b);
    });
  }
  for (const el of imageBubbles) if (!next.has(el)) { el.style.transform = ""; el.classList.remove("wt-tilting"); }
  imageBubbles = next;
}

function followImages(ev) {
  if (!imageBubbles.size) return;
  const main = document.querySelector("#main");
  const view = main ? main.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const halfW = innerWidth / 2, halfH = innerHeight / 2;
  for (const el of imageBubbles) {
    const r = el.getBoundingClientRect();
    if (r.bottom < view.top || r.top > view.bottom) continue; // fora da tela
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = Math.max(-1, Math.min(1, (ev.clientX - cx) / halfW));
    const dy = Math.max(-1, Math.min(1, (ev.clientY - cy) / halfH));
    el.classList.add("wt-tilt", "wt-tilting");
    el.style.transform =
      `perspective(800px) rotateX(${(-dy * 14).toFixed(2)}deg) rotateY(${(dx * 14).toFixed(2)}deg) scale(1.02)`;
  }
}

function saveCache() {
  const now = Date.now();
  for (const [k, v] of Object.entries(cache)) if (now - v.at > KEEP_MS) delete cache[k];
  chrome.storage.local.set({ wt_cache: cache });
}

const cached = (id) => Object.prototype.hasOwnProperty.call(cache, id);

// ---------- varredura do DOM ----------
let scanTimer = null;
function scheduleScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 250);
}

new MutationObserver(scheduleScan).observe(document, { childList: true, subtree: true });

function scan() {
  refreshImages();
  if (!ready) return;
  document.querySelectorAll("#main [data-id]").forEach((msg) => {
    const id = msg.getAttribute("data-id");
    if (!id || msg.querySelector("[data-id]")) return; // ignora contêineres e citações
    const btn = msg.querySelector(PLAY_SEL);
    const box = msg.querySelector(":scope .wt-box");
    if (!btn && !box && !cached(id)) return; // não é áudio
    if (!box && isOutgoing(msg)) return;    // áudio que você mandou: não transcreve

    const ui = box || renderBox(msg, id);
    if (cached(id)) return showText(ui, cache[id].t, freshIds.delete(id));
    if (queued.has(id)) return setStatus(ui, "Transcrevendo…");
    if (settings.auto && btn) enqueue(id);
  });
}

// o data-id não diz mais se é enviada; usa o "rabinho" do balão ou a posição na tela
function isOutgoing(msg) {
  const tail = msg.querySelector('[data-icon^="tail-"]');
  if (tail) return tail.getAttribute("data-icon") === "tail-out";
  const main = document.querySelector("#main").getBoundingClientRect();
  const b = (msg.querySelector(PLAY_SEL) || msg).getBoundingClientRect();
  return b.left > main.left + main.width / 2;
}

function renderBox(msg, id) {
  const box = document.createElement("div");
  box.className = "wt-box";
  box.innerHTML = '<button class="wt-btn" type="button">✦ Transcrever</button><div class="wt-text"></div>';
  box.querySelector(".wt-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    delete cache[id];
    enqueue(id);
  });
  msg.appendChild(box);
  return box;
}

function setStatus(box, txt, isErr) {
  delete box.dataset.shown;
  box.querySelector(".wt-btn").style.display = "none";
  const t = box.querySelector(".wt-text");
  t.textContent = txt;
  t.classList.toggle("wt-muted", !isErr);
  t.classList.toggle("wt-err", !!isErr);
}

function showText(box, txt, animate) {
  txt = txt || "(áudio sem fala)";
  if (box.dataset.shown === txt) return; // já está na tela (a varredura roda o tempo todo)
  box.dataset.shown = txt;
  box.querySelector(".wt-btn").style.display = "none";
  const t = box.querySelector(".wt-text");
  t.classList.remove("wt-muted", "wt-err");

  // áudio longo: mostra 3 linhas e um "ver tudo"
  const long = txt.length > 260;
  box.classList.toggle("wt-long", long);
  let more = box.querySelector(".wt-more");
  if (long && !more) {
    more = document.createElement("button");
    more.className = "wt-more";
    more.type = "button";
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      more.textContent = box.classList.toggle("wt-open") ? "ver menos" : "ver tudo";
    });
    box.appendChild(more);
  }
  if (more) { more.hidden = !long; more.textContent = box.classList.contains("wt-open") ? "ver menos" : "ver tudo"; }

  if (!animate || !look.typefx) { t.classList.remove("wt-typing"); t.textContent = txt; return; }
  // efeito digitando: ~1,5 s no total, independente do tamanho
  t.textContent = "";
  t.classList.add("wt-typing");
  const step = Math.max(1, Math.ceil(txt.length / 90));
  let i = 0;
  const tick = () => {
    if (box.dataset.shown !== txt) return;
    i = Math.min(txt.length, i + step);
    t.textContent = txt.slice(0, i);
    if (i < txt.length) setTimeout(tick, 16);
    else t.classList.remove("wt-typing");
  };
  tick();
}

function showError(id, err) {
  const msg = document.querySelector(`#main [data-id="${CSS.escape(id)}"]`);
  const box = msg && msg.querySelector(".wt-box");
  if (!box) return;
  setStatus(box, "⚠ " + err, true);
  const b = box.querySelector(".wt-btn");
  b.style.display = "";
  b.textContent = "↻ Tentar de novo";
}

// ---------- fila ----------
function enqueue(id) {
  if (queued.has(id)) return;
  queued.add(id);
  queue.push(id);
  scheduleScan();
  pump();
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const id = queue.shift();
    try {
      // A primeira transcrição depois de abrir o WhatsApp às vezes falha (extensão
      // acordando, modelo carregando, áudio ainda não baixado). Tenta mais uma vez,
      // em silêncio, antes de mostrar o erro.
      let r;
      for (let attempt = 0; ; attempt++) {
        try {
          const msg = document.querySelector(`#main [data-id="${CSS.escape(id)}"]`);
          const btn = msg && msg.querySelector(PLAY_SEL);
          if (!btn) throw Object.assign(new Error("abra a conversa do áudio e tente de novo"), { final: true });
          const { buf, mime } = await capture(btn);
          r = await chrome.runtime.sendMessage({ type: "transcribe", b64: toB64(buf), mime });
          if (!r || !r.ok) throw new Error((r && r.error) || "falha na transcrição");
          break;
        } catch (e) {
          if (e.final || attempt >= 1) throw e;
          await new Promise((res) => setTimeout(res, 1500));
        }
      }
      cache[id] = { t: r.text, at: Date.now() };
      freshIds.add(id);
      saveCache();
    } catch (e) {
      queued.delete(id);
      showError(id, e.message || String(e));
      continue;
    }
    queued.delete(id);
    scheduleScan();
  }
  busy = false;
}

function capture(btn) {
  const reqId = Math.random().toString(36).slice(2);
  const root = document.documentElement;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { done(); reject(new Error("tempo esgotado baixando o áudio")); }, 30000);
    function onMsg(e) {
      if (e.source !== window || !e.data || e.data.id !== reqId) return;
      done();
      if (e.data.__wt === "audio") resolve(e.data);
      else reject(new Error(e.data.msg));
    }
    function done() {
      clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      if (root.dataset.wtCapture === reqId) delete root.dataset.wtCapture;
    }
    window.addEventListener("message", onMsg);
    root.dataset.wtCapture = reqId;
    (btn.closest('button,[role="button"]') || btn).click();
  });
}

function toB64(buf) {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
