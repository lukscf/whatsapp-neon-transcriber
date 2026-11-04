// Efeitos visuais: fundo animado, vidro, brilho do mouse, entrada de mensagem,
// bordas animadas, formato do balão, áudio pulsando, não lidas e modo discreto.
// Cada efeito liga/desliga por uma classe no <html> (veja fx.css).
(() => {
  const FX_DEFAULTS = {
    bgfx: "estrelas", glass: true, glow: true, enterfx: true, borders: true,
    shape: "padrao", wavefx: true, unreadfx: true, compact: false, privacy: false
  };
  const fx = { ...FX_DEFAULTS };
  const root = document.documentElement;

  chrome.storage.local.get(Object.keys(FX_DEFAULTS), (s) => {
    for (const k in FX_DEFAULTS) if (s[k] !== undefined) fx[k] = s[k];
    apply();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    let hit = false;
    for (const k in FX_DEFAULTS) if (ch[k]) { fx[k] = ch[k].newValue; hit = true; }
    if (hit) apply();
  });

  function apply() {
    root.classList.toggle("wt-bgfx", fx.bgfx !== "nenhum");
    root.classList.toggle("wt-glass", !!fx.glass);
    root.classList.toggle("wt-glow", !!fx.glow);
    root.classList.toggle("wt-borders", !!fx.borders);
    root.classList.toggle("wt-wavefx", !!fx.wavefx);
    root.classList.toggle("wt-unreadfx", !!fx.unreadfx);
    root.classList.toggle("wt-compact", !!fx.compact);
    root.classList.toggle("wt-privacy", !!fx.privacy);
    for (const s of ["arredondado", "quadrado", "terminal"]) root.classList.toggle("wt-shape-" + s, fx.shape === s);
    if (!fx.glow && glowEl) glowEl.style.opacity = "0";
    if (fx.bgfx === "nenhum") stopBg(); else ensureBg();
    sweep();
  }

  const hue = () => +(root.dataset.wtHue || 282);

  // ---------- partes da tela ----------
  // superfície do balão = primeiro elemento com fundo pintado dentro da linha
  const surfaceOf = new WeakMap();
  function surface(row) {
    // o WhatsApp redesenha o balão de vez em quando: só vale o guardado se ainda está na linha
    const c = surfaceOf.get(row);
    if (c && c.isConnected && row.contains(c)) return c;
    let found = null;
    for (const e of row.querySelectorAll("div")) {
      if (e.closest("[data-id]") !== row) continue;
      if (e.offsetWidth < 40) continue;
      if (getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)") { found = e; break; }
    }
    if (found) surfaceOf.set(row, found);
    return found;
  }

  function messageRows() {
    return [...document.querySelectorAll("#main [data-id]")].filter((r) => !r.querySelector("[data-id]"));
  }

  // ---------- varredura (balões, áudio tocando, não lidas, papel de parede) ----------
  let sweepTimer = 0;
  function scheduleSweep() { if (!sweepTimer) sweepTimer = setTimeout(() => { sweepTimer = 0; sweep(); }, 200); }

  function sweep() {
    const main = document.querySelector("#main");
    if (main) {
      if (fx.bgfx !== "nenhum") ensureBg();
      // esconde a camada do papel de parede do WhatsApp (absoluta e do tamanho do painel)
      const mr = main.getBoundingClientRect();
      for (const e of main.children) markWall(e, mr);
      for (const row of messageRows()) {
        const s = surface(row);
        if (!s) continue;
        s.classList.add("wt-bubble");
        if (!s.querySelector(":scope > .wt-border")) {
          const b = document.createElement("span");
          b.className = "wt-border";
          s.appendChild(b);
        }
        const playing = !!row.querySelector('button[aria-label^="Pausar" i], button[aria-label^="Pause" i]');
        s.classList.toggle("wt-playing", playing);
      }
    }
    for (const row of document.querySelectorAll('#pane-side [role="row"]')) {
      const cell = row.firstElementChild;
      if (!cell) continue;
      const unread = !!row.querySelector('[aria-label*="não lida" i], [aria-label*="unread" i]');
      cell.classList.toggle("wt-unread", unread);
    }
    if (fx.privacy) markPrivate(main);
  }

  // Modo discreto: marca só fotos e nomes. Mensagens e prévias continuam legíveis.
  function markPrivate(main) {
    const pv = (e) => e && e.classList.add("wt-pv");
    for (const row of document.querySelectorAll('#pane-side [role="row"]')) {
      row.querySelectorAll('img, [data-icon^="default-"]').forEach(pv);
      // nome = primeiro span[title] que não é o status/prévia da última mensagem
      pv([...row.querySelectorAll("span[title]")].find((s) => !s.closest('[data-testid="last-msg-status"]')));
    }
    if (!main) return;
    const header = main.querySelector("header");
    if (header) header.querySelectorAll('img, [data-icon^="default-"], span[title], span[dir="auto"]').forEach(pv);
    // fotinha de quem mandou (grupo): o WhatsApp desenha numa camada fora da linha da
    // mensagem, então pega toda imagem pequena da conversa (fotos e figurinhas são maiores)
    main.querySelectorAll('img, [data-icon^="default-"]').forEach((i) => {
      const w = i.getBoundingClientRect().width;
      if (!(w > 0 && w < 60)) return;
      // emoji também é <img> pequena: o alt é o próprio emoji
      if (i.tagName === "IMG" && (/emoji/i.test(i.className + " " + i.src) || (i.alt && [...i.alt].length <= 4))) return;
      pv(i);
    });
    for (const row of messageRows()) {
      // nome (e telefone) de quem mandou no grupo. Contato salvo vem só com
      // data-testid="author"; número não salvo vem também com aria-label.
      for (const s of row.querySelectorAll('[data-testid="author"], span[aria-label]')) {
        if (s.closest(".selectable-text") || s.closest("button")) continue;
        const line = s.parentElement;
        pv(line && line.getBoundingClientRect().height < 32 ? line : s);
      }
    }
  }

  function markWall(e, mr) {
    if (e.id === "wt-bg") return;
    const st = getComputedStyle(e);
    if (st.position === "absolute") {
      const r = e.getBoundingClientRect();
      if (r.width >= mr.width * 0.9 && r.height >= mr.height * 0.6 && e.childElementCount <= 1) e.classList.add("wt-wall");
    }
    for (const c of e.children) if (c.childElementCount <= 2 && getComputedStyle(c).position === "absolute") {
      const r = c.getBoundingClientRect();
      if (r.width >= mr.width * 0.9 && r.height >= mr.height * 0.6 && c.childElementCount === 0) c.classList.add("wt-wall");
    }
  }

  // ---------- entrada de mensagem nova ----------
  let lastChat = null;
  const mo = new MutationObserver((muts) => {
    scheduleSweep();
    if (!fx.enterfx) return;
    const main = document.querySelector("#main");
    if (!main) return;
    const chat = main.querySelector("header") && main.querySelector("header").textContent.slice(0, 60);
    const fresh = [];
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof Element) || !main.contains(n)) continue;
      const rows = n.matches("[data-id]") ? [n] : [...n.querySelectorAll("[data-id]")];
      for (const r of rows) if (!r.querySelector("[data-id]")) fresh.push(r);
    }
    // abrir conversa ou rolar o histórico adiciona muitas linhas de uma vez: não anima
    if (chat !== lastChat) { lastChat = chat; return; }
    if (!fresh.length || fresh.length > 3) return;
    requestAnimationFrame(() => {
      for (const r of fresh) {
        const s = surface(r);
        if (!s) continue;
        s.classList.add("wt-enter");
        setTimeout(() => s.classList.remove("wt-enter"), 900);
      }
    });
  });
  mo.observe(document, { childList: true, subtree: true });
  setInterval(sweep, 800); // pega play/pause do áudio e contadores que mudam sem nó novo

  // ---------- brilho que segue o mouse ----------
  let glowEl = null;
  document.addEventListener("mousemove", (e) => {
    if (!fx.glow) return;
    if (!glowEl) {
      glowEl = document.createElement("div");
      glowEl.id = "wt-glow";
      document.documentElement.appendChild(glowEl);
    }
    glowEl.style.opacity = "";
    glowEl.style.transform = `translate(${e.clientX - 210}px, ${e.clientY - 210}px)`;
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => { if (glowEl) glowEl.style.opacity = "0"; });

  // ---------- modo discreto: Alt+P ----------
  document.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyP") {
      e.preventDefault();
      e.stopPropagation();
      chrome.storage.local.set({ privacy: !fx.privacy });
    }
  }, true);

  // ---------- fundo animado ----------
  let canvas = null, ctx = null, raf = 0, last = 0, state = null, mode = null;

  function ensureBg() {
    const main = document.querySelector("#main");
    if (!main) return;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "wt-bg";
      ctx = canvas.getContext("2d");
    }
    if (canvas.parentElement !== main) main.prepend(canvas);
    if (mode !== fx.bgfx) { mode = fx.bgfx; state = null; }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stopBg() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (canvas) canvas.remove();
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !canvas || !canvas.isConnected) return;
    const fps = mode === "matrix" ? 18 : 30;
    if (t - last < 1000 / fps) return;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; state = null; }
    const fn = SCENES[mode];
    if (fn) fn(w, h, dt, t / 1000);
  }

  const SCENES = {
    estrelas: (w, h, dt) => stars(w, h, dt),
    synthwave: (w, h, dt, s) => synth(w, h, s),
    matrix: (w, h) => matrix(w, h),
    aurora, bokeh, warp, ondas, constelacao, chuva, vagalumes
  };

  // posição do mouse relativa ao canvas (a constelação reage a ela)
  let mx = -1e4, my = -1e4;
  document.addEventListener("mousemove", (e) => {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  }, { passive: true });

  const rand = (a, b) => a + Math.random() * (b - a);

  // faixas de luz ondulando, como aurora boreal
  function aurora(w, h, dt, t) {
    const H = hue();
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (let b = 0; b < 4; b++) {
      const hh = (H + b * 22 - 30 + 360) % 360, base = h * (0.18 + b * 0.13);
      const g = ctx.createLinearGradient(0, base - 120, 0, base + 160);
      g.addColorStop(0, `hsl(${hh} 100% 60% / 0)`);
      g.addColorStop(0.45, `hsl(${hh} 100% 62% / .22)`);
      g.addColorStop(1, `hsl(${hh} 100% 50% / 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const y = base + Math.sin(x / (160 + b * 40) + t * (0.35 + b * 0.12)) * 40
                       + Math.sin(x / 70 - t * 0.5 + b) * 14;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // bolhas desfocadas subindo devagar
  function bokeh(w, h, dt) {
    const H = hue();
    if (!state) state = Array.from({ length: 26 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(14, 60), v: rand(6, 22), o: rand(-25, 25), p: rand(0, 6.28) }));
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const b of state) {
      b.y -= b.v * dt; b.p += dt * 0.6;
      if (b.y < -b.r) { b.y = h + b.r; b.x = rand(0, w); }
      const x = b.x + Math.sin(b.p) * 20, hh = (H + b.o + 360) % 360;
      const g = ctx.createRadialGradient(x, b.y, 0, x, b.y, b.r);
      g.addColorStop(0, `hsl(${hh} 100% 70% / .28)`);
      g.addColorStop(0.7, `hsl(${hh} 100% 60% / .12)`);
      g.addColorStop(1, `hsl(${hh} 100% 60% / 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // hiperespaço: estrelas saindo do centro em riscos
  function warp(w, h, dt) {
    const H = hue(), cx = w / 2, cy = h / 2;
    if (!state) state = Array.from({ length: 220 }, () => ({ a: rand(0, 6.283), d: rand(0, 1), s: rand(0.15, 0.6) }));
    ctx.clearRect(0, 0, w, h);
    const max = Math.hypot(cx, cy);
    ctx.lineCap = "round";
    for (const p of state) {
      const d0 = p.d;
      p.d += p.s * dt * (0.3 + p.d);
      if (p.d > 1) { p.d = rand(0, 0.05); p.a = rand(0, 6.283); continue; }
      const r0 = d0 * d0 * max, r1 = p.d * p.d * max;
      const c = Math.cos(p.a), s = Math.sin(p.a);
      ctx.strokeStyle = `hsl(${H} 100% ${70 + p.d * 25}% / ${0.15 + p.d * 0.8})`;
      ctx.lineWidth = 0.5 + p.d * 2.2;
      ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + s * r0); ctx.lineTo(cx + c * (r1 + 2), cy + s * (r1 + 2)); ctx.stroke();
    }
  }

  // ondas de luz atravessando a tela
  function ondas(w, h, dt, t) {
    const H = hue();
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 10;
    for (let i = 0; i < 6; i++) {
      const hh = (H + i * 12 - 30 + 360) % 360;
      ctx.strokeStyle = `hsl(${hh} 100% 65% / ${0.18 + i * 0.05})`;
      ctx.shadowColor = `hsl(${hh} 100% 60%)`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.5 + Math.sin(x / (120 + i * 30) + t * (0.6 + i * 0.15) + i) * (40 + i * 14)
                          + Math.sin(x / 45 + t * 1.3) * 6;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // pontos ligados por linhas; os perto do mouse se conectam a ele
  function constelacao(w, h, dt) {
    const H = hue();
    if (!state) state = Array.from({ length: Math.round((w * h) / 9000) }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-14, 14), vy: rand(-14, 14) }));
    ctx.clearRect(0, 0, w, h);
    const L = 110;
    for (const p of state) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < state.length; i++) {
      const a = state[i];
      for (let j = i + 1; j < state.length; j++) {
        const b = state[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < L) {
          ctx.strokeStyle = `hsl(${H} 100% 70% / ${(1 - d / L) * 0.35})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const dm = Math.hypot(a.x - mx, a.y - my);
      if (dm < L * 1.6) {
        ctx.strokeStyle = `hsl(${H} 100% 80% / ${(1 - dm / (L * 1.6)) * 0.7})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke();
      }
      ctx.fillStyle = `hsl(${H} 100% 82% / .85)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, 6.283); ctx.fill();
    }
  }

  // chuva de riscos neon caindo inclinada
  function chuva(w, h, dt) {
    const H = hue();
    if (!state) state = Array.from({ length: 140 }, () => ({ x: rand(0, w), y: rand(-h, h), l: rand(10, 34), v: rand(380, 760) }));
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    for (const d of state) {
      d.y += d.v * dt; d.x -= d.v * dt * 0.18;
      if (d.y > h + d.l) { d.y = rand(-60, -10); d.x = rand(0, w * 1.2); }
      ctx.strokeStyle = `hsl(${H} 100% 75% / ${0.18 + (d.v - 380) / 1500})`;
      ctx.lineWidth = d.v > 650 ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.18, d.y - d.l); ctx.stroke();
    }
  }

  // vaga-lumes piscando e vagando
  function vagalumes(w, h, dt) {
    const H = hue();
    if (!state) state = Array.from({ length: 45 }, () => ({ x: rand(0, w), y: rand(0, h), a: rand(0, 6.283), p: rand(0, 6.283), s: rand(10, 28) }));
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const f of state) {
      f.a += rand(-1.5, 1.5) * dt; f.p += dt * rand(1, 2.4);
      f.x = (f.x + Math.cos(f.a) * f.s * dt + w) % w;
      f.y = (f.y + Math.sin(f.a) * f.s * dt + h) % h;
      const o = Math.max(0, Math.sin(f.p)) ** 2;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 16);
      g.addColorStop(0, `hsl(${(H + 40) % 360} 100% 85% / ${0.9 * o})`);
      g.addColorStop(0.3, `hsl(${H} 100% 65% / ${0.35 * o})`);
      g.addColorStop(1, `hsl(${H} 100% 60% / 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, 16, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function stars(w, h, dt) {
    if (!state) {
      state = Array.from({ length: Math.round((w * h) / 4500) }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.9 + 0.1, p: Math.random() * 6.28
      }));
    }
    const H = hue();
    ctx.clearRect(0, 0, w, h);
    for (const s of state) {
      s.x -= (8 + 40 * s.z) * dt;
      s.p += dt * (1 + s.z * 2);
      if (s.x < -2) { s.x = w + 2; s.y = Math.random() * h; }
      const a = 0.35 + 0.45 * s.z * (0.6 + 0.4 * Math.sin(s.p));
      ctx.fillStyle = s.z > 0.75 ? `hsl(${H} 100% 82% / ${a})` : `hsl(${H} 30% 90% / ${a})`;
      const r = 0.4 + s.z * 1.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, 6.283);
      ctx.fill();
      if (s.z > 0.85) { ctx.fillStyle = `hsl(${H} 100% 70% / ${a * 0.25})`; ctx.beginPath(); ctx.arc(s.x, s.y, r * 4, 0, 6.283); ctx.fill(); }
    }
  }

  function synth(w, h, time) {
    const H = hue(), hz = h * 0.42;
    ctx.clearRect(0, 0, w, h);
    // céu
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, `hsl(${H} 60% 6% / 0)`);
    g.addColorStop(1, `hsl(${(H + 40) % 360} 90% 30% / .35)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hz);
    // sol listrado
    const R = Math.min(w, h) * 0.17, cx = w / 2, cy = hz - R * 0.25;
    g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    g.addColorStop(0, `hsl(${(H + 50) % 360} 100% 65% / .75)`);
    g.addColorStop(1, `hsl(${H} 100% 55% / .75)`);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hz);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 6; i++) {
      const y = cy + R * (0.1 + i * 0.16), th = 2 + i * 1.6;
      ctx.fillRect(cx - R, y, R * 2, th);
    }
    ctx.restore();
    // chão com grade
    g = ctx.createLinearGradient(0, hz, 0, h);
    g.addColorStop(0, `hsl(${H} 80% 20% / .35)`);
    g.addColorStop(1, `hsl(${H} 60% 5% / 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, hz, w, h - hz);
    ctx.strokeStyle = `hsl(${H} 100% 65% / .45)`;
    ctx.lineWidth = 1;
    ctx.shadowColor = `hsl(${H} 100% 60%)`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) { ctx.moveTo(cx + i * 6, hz); ctx.lineTo(cx + i * w * 0.16, h); }
    const off = (time * 0.35) % 1;
    for (let i = 0; i < 14; i++) {
      const p = (i + off) / 14, y = hz + (h - hz) * p * p;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF$#*+<>";
  function matrix(w, h) {
    const size = 15, cols = Math.ceil(w / size), H = hue();
    if (!state || state.length !== cols) state = Array.from({ length: cols }, () => Math.random() * -h / size);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.14)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `${size}px monospace`;
    for (let i = 0; i < cols; i++) {
      const y = state[i] * size;
      ctx.fillStyle = `hsl(${H} 100% 88% / .9)`;
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * size, y);
      ctx.fillStyle = `hsl(${H} 100% 60% / .55)`;
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * size, y - size);
      state[i] = y > h && Math.random() > 0.975 ? 0 : state[i] + 1;
    }
  }
})();
