// Documento offscreen: decodifica o áudio (precisa de AudioContext, que só existe
// aqui) e manda pro worker do Whisper, que faz o trabalho pesado fora desta thread.
const worker = new Worker("whisper-worker.js", { type: "module" });
const pending = new Map();
let nextId = 1;

worker.onmessage = ({ data }) => {
  const p = pending.get(data.id);
  if (!p) return;
  pending.delete(data.id);
  data.ok ? p.resolve(data.text) : p.reject(new Error(data.error));
};
worker.onerror = (e) => {
  for (const p of pending.values()) p.reject(new Error(e.message || "erro no worker do Whisper"));
  pending.clear();
};

function ask(msg, transfer) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...msg, id }, transfer || []);
  });
}

async function decode(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(bytes.buffer);
    if (buf.numberOfChannels === 1) return buf.getChannelData(0).slice();
    const a = buf.getChannelData(0), b = buf.getChannelData(1), out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    return out;
  } finally {
    ctx.close();
  }
}

chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (!m || m.target !== "offscreen") return;
  const reply = (p) => p.then((text) => send({ ok: true, text }), (e) => send({ ok: false, error: String(e.message || e) }));
  if (m.type === "warmup") { reply(ask({ type: "warmup", model: m.model })); return true; }
  if (m.type === "whisper") {
    reply(decode(m.b64).then((audio) =>
      ask({ type: "whisper", model: m.model, language: m.language, audio }, [audio.buffer])));
    return true;
  }
});
