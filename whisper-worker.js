// Worker do Whisper. Roda fora da thread principal da extensão: enquanto um áudio
// é transcrito, o popup e o resto da extensão continuam respondendo.

// A extensão usa só WASM. Escondendo o WebGPU, o transformers.js não chama
// requestAdapter() e o Chrome para de mostrar o aviso de "powerPreference".
try { Object.defineProperty(WorkerNavigator.prototype, "gpu", { get: () => undefined, configurable: true }); } catch {}

const lib = import("./lib/transformers.min.js").then(({ pipeline, env }) => {
  env.allowLocalModels = false;
  env.backends.onnx.wasm.wasmPaths = new URL("lib/", self.location.href).href;
  env.backends.onnx.wasm.numThreads = 1; // sem cross-origin isolation não há threads
  return pipeline;
});

const pipes = new Map(); // modelo -> Promise<pipeline>
function getPipe(model) {
  if (!pipes.has(model)) {
    const p = lib.then((pipeline) => pipeline("automatic-speech-recognition", model, { dtype: "q8", device: "wasm" }));
    p.catch(() => pipes.delete(model));
    pipes.set(model, p);
  }
  return pipes.get(model);
}

self.onmessage = async ({ data: m }) => {
  try {
    const asr = await getPipe(m.model);
    if (m.type === "warmup") return self.postMessage({ id: m.id, ok: true });
    const opts = { task: "transcribe", chunk_length_s: 30, stride_length_s: 5 };
    if (m.language) opts.language = m.language;
    const out = await asr(m.audio, opts);
    const text = (Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text || "").trim();
    self.postMessage({ id: m.id, ok: true, text });
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
};
