const $ = (id) => document.getElementById(id);
const PRESETS = ["roxo", "azul", "rosa", "vermelho", "laranja", "ciano", "matrix", "bullet"];

chrome.storage.local.get(["localModel", "language", "auto", "theme", "preset", "font", "fx3d"], (s) => {
  $("localModel").value = s.localModel || "Xenova/whisper-small";
  $("language").value = s.language ?? "pt";
  $("auto").checked = s.auto ?? true;
  $("theme").checked = s.theme ?? true;
  $("font").value = s.font || "padrao";
  $("fx3d").checked = s.fx3d ?? true;
  markPreset(PRESETS.includes(s.preset) ? s.preset : "roxo");
});

// ---------- privacidade: apagar tudo que foi transcrito ----------
$("wipe").addEventListener("click", () => {
  if (!confirm("Apagar todas as transcrições salvas neste Chrome?")) return;
  chrome.storage.local.remove("wt_cache", () => { $("wipe").textContent = "Transcrições apagadas ✓"; });
});

// ---------- transcrição ----------
$("auto").addEventListener("change", () => chrome.storage.local.set({ auto: $("auto").checked }));

$("save").addEventListener("click", () => {
  chrome.storage.local.set({ localModel: $("localModel").value, language: $("language").value.trim() }, () => {
    $("ok").textContent = "Salvo ✓ Baixando o modelo…";
    chrome.runtime.sendMessage({ type: "warmup" }, (r) => {
      $("ok").textContent = r && r.ok ? "Modelo pronto ✓" : "Erro: " + ((r && r.error) || chrome.runtime.lastError?.message || "?");
    });
  });
});

// ---------- aparência: aplica na hora ----------
function markPreset(p) {
  document.querySelectorAll(".sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === p)));
}
document.querySelectorAll(".sw").forEach((b) => b.addEventListener("click", () => {
  markPreset(b.dataset.p);
  // Escolher Bullet liga junto o fundo de balas e cripto
  if (b.dataset.p === "bullet") {
    chrome.storage.local.set({ preset: "bullet", bgfx: "bullet" });
    const sel = document.getElementById("bgfx");
    if (sel) sel.value = "bullet";
    return;
  }
  chrome.storage.local.set({ preset: b.dataset.p });
}));
$("theme").addEventListener("change", () => chrome.storage.local.set({ theme: $("theme").checked }));
$("font").addEventListener("change", () => chrome.storage.local.set({ font: $("font").value }));
$("fx3d").addEventListener("change", () => chrome.storage.local.set({ fx3d: $("fx3d").checked }));

// ---------- efeitos: cada controle com data-k grava a própria chave ----------
const FX_DEFAULTS = {
  bgfx: "estrelas", shape: "padrao", glass: true, glow: true, enterfx: true, borders: true,
  wavefx: true, typefx: true, unreadfx: true, compact: false, privacy: false
};
const fxEls = [...document.querySelectorAll("[data-k]")];
chrome.storage.local.get(Object.keys(FX_DEFAULTS), (s) => {
  for (const el of fxEls) {
    const v = s[el.dataset.k] ?? FX_DEFAULTS[el.dataset.k];
    if (el.type === "checkbox") el.checked = !!v; else el.value = v;
  }
});
for (const el of fxEls) {
  el.addEventListener("change", () =>
    chrome.storage.local.set({ [el.dataset.k]: el.type === "checkbox" ? el.checked : el.value }));
}
// Alt+P no WhatsApp também muda o modo discreto: mantém a caixinha em dia
chrome.storage.onChanged.addListener((ch) => { if (ch.privacy) $("privacy").checked = !!ch.privacy.newValue; });
