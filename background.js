// Service worker: transcrição com o Whisper local e o ícone na cor do tema.
const PRESETS = { roxo: 282, azul: 205, rosa: 322, vermelho: 352, laranja: 24, ciano: 180, matrix: 135, bullet: 76 };

chrome.runtime.onMessage.addListener((m, _sender, send) => {
  if (!m || m.target === "offscreen") return;
  if (m.type === "transcribe") {
    transcribe(m).then(
      (text) => send({ ok: true, text }),
      (e) => send({ ok: false, error: e.message || String(e) })
    );
    return true;
  }
  if (m.type === "warmup") {
    warmup().then(() => send({ ok: true }), (e) => send({ ok: false, error: e.message || String(e) }));
    return true;
  }
});

async function getSettings() {
  const s = await chrome.storage.local.get(["localModel", "language"]);
  return { localModel: s.localModel || "Xenova/whisper-small", language: s.language ?? "pt" };
}

// ---------- Whisper local (documento offscreen) ----------
let creating = null;
async function ensureOffscreen() {
  const url = chrome.runtime.getURL("offscreen.html");
  const has = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
  if (has.length) return;
  creating ??= chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["WORKERS"],
    justification: "Rodar o modelo Whisper localmente para transcrever áudios"
  }).finally(() => (creating = null));
  await creating;
}

// Logo depois de criado, o documento offscreen pode ainda não ter registrado o
// listener: a primeira mensagem voltava "Receiving end does not exist" ou sem
// resposta. Tenta de novo por alguns segundos antes de desistir.
async function askOffscreen(msg) {
  for (let i = 0; ; i++) {
    try {
      const r = await chrome.runtime.sendMessage({ target: "offscreen", ...msg });
      if (r !== undefined || i >= 20) return r;
    } catch (e) {
      if (i >= 20 || !/Receiving end does not exist|message port closed/i.test(String(e.message || e))) throw e;
    }
    await new Promise((res) => setTimeout(res, 150));
  }
}

async function transcribe({ b64 }) {
  const s = await getSettings();
  await ensureOffscreen();
  const r = await askOffscreen({ type: "whisper", b64, model: s.localModel, language: s.language });
  if (!r || !r.ok) throw new Error((r && r.error) || "falha no Whisper local");
  return r.text;
}

async function warmup() {
  const s = await getSettings();
  await ensureOffscreen();
  const r = await askOffscreen({ type: "warmup", model: s.localModel });
  if (!r || !r.ok) throw new Error((r && r.error) || "falha ao carregar o modelo");
}

// ---------- ícone na cor escolhida ----------
// Mesmo desenho do icons/*.png (que fica de reserva), só que com o matiz do tema.
function drawIcon(size, h, bullet) {
  if (bullet) return drawBulletIcon(size);
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const pad = Math.max(0.5, size * 0.04), rad = size * 0.22, w = size - 2 * pad;
  const box = new Path2D();
  box.roundRect(pad, pad, w, w, rad);

  let grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, `hsl(${h} 68% 12%)`);
  grad.addColorStop(1, `hsl(${h} 60% 4%)`);
  g.fillStyle = grad;
  g.fill(box);

  if (size >= 32) {
    g.save();
    g.shadowColor = `hsl(${h} 100% 58%)`;
    g.shadowBlur = size * 0.08;
    g.strokeStyle = `hsl(${h} 100% 58% / .55)`;
    g.lineWidth = size * 0.05;
    g.stroke(box);
    g.restore();
  }
  grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, `hsl(${h} 100% 78%)`);
  grad.addColorStop(1, `hsl(${h} 82% 50%)`);
  g.strokeStyle = grad;
  g.lineWidth = Math.max(1, size * 0.035);
  g.stroke(box);

  g.font = `900 ${Math.round(size * 0.46)}px "Segoe UI Black", "Segoe UI", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const y = size * 0.53;
  if (size >= 32) {
    g.save();
    g.shadowColor = `hsl(${h} 100% 62%)`;
    g.shadowBlur = size * 0.1;
    g.fillStyle = `hsl(${h} 100% 70%)`;
    g.fillText("WP", size / 2, y);
    g.restore();
  }
  grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, `hsl(${h} 100% 96%)`);
  grad.addColorStop(1, `hsl(${h} 100% 74%)`);
  g.fillStyle = grad;
  g.fillText("WP", size / 2, y);
  return g.getImageData(0, 0, size, size);
}

// Tema Bullet: ladrilho ink, letras paper-100 e um fio lime (acento só em detalhe).
function drawBulletIcon(size) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const pad = Math.max(0.5, size * 0.04), rad = size * 0.22, w = size - 2 * pad;
  const box = new Path2D();
  box.roundRect(pad, pad, w, w, rad);
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#1A1A1A");
  grad.addColorStop(1, "#070707");
  g.fillStyle = grad;
  g.fill(box);
  g.strokeStyle = "#C2F141";
  g.lineWidth = Math.max(1, size * 0.04);
  g.stroke(box);
  g.font = `800 ${Math.round(size * 0.46)}px "Open Sans", "Segoe UI", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#F8F3E9";
  g.fillText("WP", size / 2, size * 0.53);
  return g.getImageData(0, 0, size, size);
}

async function updateIcon() {
  const { preset } = await chrome.storage.local.get("preset");
  const h = PRESETS[preset] ?? PRESETS.roxo;
  const imageData = {};
  for (const s of [16, 32, 48, 128]) imageData[s] = drawIcon(s, h, preset === "bullet");
  await chrome.action.setIcon({ imageData });
}

chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.preset) updateIcon(); });
chrome.runtime.onStartup.addListener(updateIcon);
chrome.runtime.onInstalled.addListener(updateIcon);
updateIcon();
