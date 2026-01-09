/* Genoo-inspired UX + dynamic background + hash routing
   + NEW Story page
   + Touch/Pointer-to-light glow on frames/cards
   + Auto-typing hero name
*/
(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setYear() {
    const y = new Date().getFullYear();
    const el = qs("[data-year]");
    if (el) el.textContent = String(y);
  }

  function encodeMailto(s) {
    return encodeURIComponent(s).replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16)
    );
  }

  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  // ----------------------------
  // Touch/Pointer-to-light glow (tables/frames/cards)
  // ----------------------------
  const GLOW_SELECTOR = [
    ".glow-surface",
    ".card",
    ".stat-card",
    ".skill-card",
    ".honor-card",
    ".media-player",
    ".topbar-pill",
    ".cmd-panel",
    ".gallery img",
  ].join(",");

  let activeGlow = null;
  let pulseTimer = null;

  function setGlow(el) {
    // remove previous
    if (activeGlow && activeGlow !== el) {
      activeGlow.classList.remove("is-active", "is-pulse");
    }
    activeGlow = el;

    if (!el) return;

    // add active
    el.classList.add("is-active");

    // restart pulse animation
    el.classList.remove("is-pulse");
    // force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add("is-pulse");

    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => el.classList.remove("is-pulse"), 980);
  }

  function glowFromEvent(e) {
    const t =
      e?.target && e.target.closest ? e.target.closest(GLOW_SELECTOR) : null;
    if (t) setGlow(t);
    else setGlow(null);
  }

  // IMPORTANT CHANGE:
  // - pointerdown/touchstart triggers glow immediately (mobile touch, mouse down, pen)
  // - no need to wait for click
  if ("PointerEvent" in window) {
    document.addEventListener(
      "pointerdown",
      (e) => {
        // only primary pointer (avoid multi-touch noise)
        if (e.isPrimary === false) return;
        // ignore right-click (desktop)
        if (typeof e.button === "number" && e.button !== 0) return;
        glowFromEvent(e);
      },
      { passive: true }
    );
  } else {
    // Fallback for older browsers
    document.addEventListener("touchstart", glowFromEvent, { passive: true });
    document.addEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 0) return;
        glowFromEvent(e);
      },
      { passive: true }
    );
  }

  // Keep keyboard accessibility glow
  document.addEventListener("focusin", (e) => {
    const t = e.target.closest(GLOW_SELECTOR);
    if (t) setGlow(t);
  });

  // ----------------------------
  // Route config
  // ----------------------------
  const ROUTES = [
    { id: "home", label: "Home", template: "tpl-home", title: "Home" },
    { id: "about", label: "About", template: "tpl-about", title: "About" },
    { id: "story", label: "Story", template: "tpl-story", title: "Story" },
    { id: "impact", label: "Impact", template: "tpl-impact", title: "Impact" },
    { id: "journey", label: "Journey", template: "tpl-journey", title: "Journey" },
    { id: "skills", label: "Skills", template: "tpl-skills", title: "Skills" },
    { id: "work", label: "Work", template: "tpl-work", title: "Work" },
    { id: "honors", label: "Honors", template: "tpl-honors", title: "Honors" },
    { id: "resume", label: "Resume", template: "tpl-resume", title: "Resume" },
    { id: "courses", label: "Courses", template: "tpl-courses", title: "Courses" },
    { id: "contact", label: "Contact", template: "tpl-contact", title: "Contact" },
  ];

  const ROUTE_MAP = new Map(ROUTES.map((r) => [r.id, r]));

  function getRouteFromHash() {
    const raw = (location.hash || "").trim();
    const m = raw.match(/^#\/([a-z0-9-]+)$/i);
    const id = m ? m[1].toLowerCase() : "home";
    return ROUTE_MAP.has(id) ? id : "home";
  }

  function ensureHash() {
    if (!location.hash || !/^#\/[a-z0-9-]+$/i.test(location.hash)) {
      location.replace("#/home");
    }
  }

  // ----------------------------
  // Reveal animation
  // ----------------------------
  let revealObserver = null;

  function initReveal(container) {
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }

    const els = qsa(".reveal", container);

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries, io) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    els.forEach((el) => revealObserver.observe(el));
  }

  // ----------------------------
  // Lazy media (YouTube / Video / PDF)
  // ----------------------------
  function clearPlayer(player) {
    player.dataset.loaded = "1";
    const cs = getComputedStyle(player);
    if (cs.position === "static") player.style.position = "relative";
    player.innerHTML = "";
  }

  function injectYouTube(player, src) {
    clearPlayer(player);
    const iframe = document.createElement("iframe");
    iframe.src = src.includes("?") ? src + "&autoplay=1" : src + "?autoplay=1";
    iframe.loading = "lazy";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.title = player.getAttribute("aria-label") || "YouTube video";
    player.appendChild(iframe);
  }

  function injectVideo(player, src) {
    clearPlayer(player);
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;

    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);

    player.appendChild(video);
    video.play().catch(() => {});
  }

  function injectPDF(player, src) {
    clearPlayer(player);
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.loading = "lazy";
    iframe.title = player.getAttribute("aria-label") || "PDF document";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    player.appendChild(iframe);

    // small "Open PDF" button
    const open = document.createElement("a");
    open.href = src;
    open.target = "_blank";
    open.rel = "noopener";
    open.className = "pdf-open";
    open.textContent = "Open PDF";
    player.appendChild(open);
  }

  function activateMedia(player) {
    if (!player || player.dataset.loaded === "1") return;

    const type = (player.dataset.mediaType || "").toLowerCase();
    const src = player.dataset.src;
    if (!src) return;

    try {
      if (type === "youtube") injectYouTube(player, src);
      else if (type === "video") injectVideo(player, src);
      else if (type === "pdf") injectPDF(player, src);
    } catch {
      window.open(src, "_blank", "noopener");
    }
  }

  document.addEventListener("click", (e) => {
    // If user clicked a link inside a media overlay, let it behave normally
    if (e.target.closest(".media-player a")) return;

    const player = e.target.closest(".media-player");
    if (!player) return;
    activateMedia(player);
  });

  document.addEventListener("keydown", (e) => {
    const player =
      e.target && e.target.closest
        ? e.target.closest(".media-player")
        : null;
    if (!player) return;

    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      activateMedia(player);
    }
  });

  // ----------------------------
  // Image fallbacks
  // ----------------------------
  function placeholder(w = 900, h = 600, text = "Image unavailable") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#02130d'/>
        <stop offset='100%' stop-color='#073224'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <rect x='14' y='14' width='${w - 28}' height='${h - 28}' rx='14' ry='14' fill='none' stroke='rgba(25,255,138,0.35)' stroke-width='2'/>
      <g fill='#b9ffe5' font-family='system-ui, sans-serif' font-size='28'>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>${text}</text>
      </g>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function initImageFallbacks(container) {
    qsa("img[data-fallback]", container).forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          img.src = placeholder(900, 600);
        },
        { once: true }
      );
    });
  }

  // ----------------------------
  // Contact form (mailto)
  // ----------------------------
  function initContactForm(container) {
    const form = qs("#contactForm", container);
    const status = qs("#formStatus", container);
    if (!form || !status) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const email = String(fd.get("email") || "").trim();
      const subject = String(fd.get("subject") || "").trim();
      const message = String(fd.get("message") || "").trim();

      if (!name || !email || !subject || !message) {
        status.textContent = "Please complete all fields.";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = "Please enter a valid email address.";
        return;
      }

      const body = ["Name: " + name, "Email: " + email, "", message].join("\n");
      const mailto = `mailto:?subject=${encodeMailto(
        subject
      )}&body=${encodeMailto(body)}`;

      status.textContent = "Opening your email client…";
      setTimeout(() => (location.href = mailto), 60);
    });
  }

  // ----------------------------
  // Command palette
  // ----------------------------
  const cmd = qs("#cmd");
  const cmdInput = qs("#cmdInput");
  const cmdList = qs("#cmdList");

  function openCmd() {
    cmd?.setAttribute("aria-hidden", "false");
    setTimeout(() => cmdInput?.focus(), 30);
  }

  function closeCmd() {
    cmd?.setAttribute("aria-hidden", "true");
    if (cmdInput) cmdInput.value = "";
    renderCmdList("");
  }

  function renderCmdList(filter) {
    if (!cmdList) return;

    const q = (filter || "").toLowerCase().trim();
    const items = ROUTES.filter((r) =>
      (r.label || "").toLowerCase().includes(q)
    );

    cmdList.innerHTML = "";
    items.forEach((r, idx) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.dataset.go = `#/` + r.id;
      if (idx === 0) li.setAttribute("aria-selected", "true");
      li.innerHTML = `<strong>Go to:</strong> ${r.label}`;
      cmdList.appendChild(li);
    });

    if (!items.length) {
      const li = document.createElement("li");
      li.className = "cmd-empty";
      li.textContent = "No matches.";
      cmdList.appendChild(li);
    }
  }

  function cmdSelectedHref() {
    if (!cmdList) return null;
    const selected =
      cmdList.querySelector('[aria-selected="true"]') ||
      cmdList.querySelector("li[data-go]");
    return selected ? selected.getAttribute("data-go") : null;
  }

  function cmdMoveSelection(dir) {
    if (!cmdList) return;
    const items = qsa("li[data-go]", cmdList);
    if (!items.length) return;

    const i = items.findIndex(
      (x) => x.getAttribute("aria-selected") === "true"
    );
    const cur = i < 0 ? 0 : i;
    const next = Math.max(0, Math.min(items.length - 1, cur + dir));

    items.forEach((x) => x.removeAttribute("aria-selected"));
    items[next].setAttribute("aria-selected", "true");
    items[next].scrollIntoView({ block: "nearest" });
  }

  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-cmd]");
    if (openBtn) {
      e.preventDefault();
      openCmd();
      return;
    }

    const closeBtn = e.target.closest("[data-close-cmd]");
    if (closeBtn) {
      e.preventDefault();
      closeCmd();
      return;
    }

    const li = e.target.closest("#cmdList li[data-go]");
    if (li) {
      const href = li.getAttribute("data-go");
      if (href) location.hash = href;
      closeCmd();
      return;
    }

    if (cmd?.getAttribute("aria-hidden") === "false") {
      const panel = e.target.closest(".cmd-panel");
      if (!panel) closeCmd();
    }
  });

  cmdInput?.addEventListener("input", () => renderCmdList(cmdInput.value));

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (cmd?.getAttribute("aria-hidden") === "false") closeCmd();
      else openCmd();
      return;
    }

    if (cmd?.getAttribute("aria-hidden") === "false") {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCmd();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        cmdMoveSelection(+1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cmdMoveSelection(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const href = cmdSelectedHref();
        if (href) location.hash = href;
        closeCmd();
      }
    }
  });

  // ----------------------------
  // Auto-typing hero name
  // ----------------------------
  let typingRunId = 0;

  async function runTyping(container) {
    const lines = qsa(".typed-line[data-typed]", container);
    if (!lines.length) return;

    typingRunId += 1;
    const myRun = typingRunId;

    // reset
    lines.forEach((el) => (el.textContent = ""));

    // reduced motion: show instantly
    if (reduceMotion) {
      lines.forEach((el) => (el.textContent = el.dataset.typed || ""));
      return;
    }

    // small delay after page mount/hero entrance
    await sleep(220);
    if (myRun !== typingRunId) return;

    // type each line sequentially
    for (const el of lines) {
      const text = el.dataset.typed || "";
      for (let i = 0; i < text.length; i++) {
        if (myRun !== typingRunId) return;
        el.textContent = text.slice(0, i + 1);
        await sleep(48);
      }
      await sleep(140);
      if (myRun !== typingRunId) return;
    }
  }

  function startHeroEntranceIfPresent(container) {
    const hero = qs(".hero-genoo", container);
    if (!hero) return;
    requestAnimationFrame(() => hero.classList.add("hero-in"));
  }

  // ----------------------------
  // Hero Neural Network (Home-only overlay)
  // ----------------------------
  let stopHeroNeural = null;

  function initHeroNeuralNet(container) {
    const canvas = qs("#heroNeural", container);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    // Helpers
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const ramp = (t, a, b) => easeOutCubic(clamp01((t - a) / (b - a)));

    // Network layout (video-style: 4-8-8-4)
    const layers = [4, 8, 8, 4];

    let w = 1,
      h = 1,
      dpr = 1;

    // Pointer influence (subtle parallax)
    const pointer = { x: 0.5, y: 0.5 };

    function onPointerMove(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      pointer.x = clamp01(x);
      pointer.y = clamp01(y);
    }

    if ("PointerEvent" in window) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // Graph
    let nodes = [];
    let layerNodeIdxs = [];
    let conns = [];
    let connsByPair = [[], [], []];

    // Active edges
    let active01 = [];
    let active12 = [];
    let active23 = [];
    let lastActiveSwap = 0;

    function buildGraph() {
      // Centered like the video (slightly right & slightly down)
      const netW = Math.min(w * 0.92, 980);
      const netH = Math.min(h * 0.62, 560);
      const cx = w * 0.54;
      const cy = h * 0.58;

      const left = cx - netW / 2;
      const top = cy - netH / 2;

      const layerX = layers.map(
        (_, i) => left + (netW * i) / (layers.length - 1)
      );

      nodes = [];
      layerNodeIdxs = [];
      let idx = 0;

      for (let li = 0; li < layers.length; li++) {
        const n = layers[li];
        layerNodeIdxs[li] = [];

        for (let j = 0; j < n; j++) {
          const x = layerX[li];
          const y = top + (netH * (j + 0.5)) / n;

          nodes.push({
            li,
            j,
            x,
            y,
            phase: Math.random() * Math.PI * 2,
            pulse: Math.random() * Math.PI * 2,
          });

          layerNodeIdxs[li].push(idx);
          idx++;
        }
      }

      // Fully connect adjacent layers
      conns = [];
      connsByPair = [[], [], []];
      let ci = 0;

      for (let pair = 0; pair < layers.length - 1; pair++) {
        const A = layerNodeIdxs[pair];
        const B = layerNodeIdxs[pair + 1];

        for (const a of A) {
          for (const b of B) {
            const weight = Math.pow(Math.random(), 1.7); // skew faint
            const seed = Math.random() * Math.PI * 2;

            conns.push({ a, b, pair, weight, seed });
            connsByPair[pair].push(ci);
            ci++;
          }
        }
      }

      pickActiveEdges();
    }

    function pickSome(from, count) {
      if (!from || !from.length) return [];
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push(from[Math.floor(Math.random() * from.length)]);
      }
      return out;
    }

    function pickActiveEdges() {
      active01 = pickSome(connsByPair[0], 18);
      active12 = pickSome(connsByPair[1], 26);
      active23 = pickSome(connsByPair[2], 18);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildGraph();
      renderStatic();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawGlow(cx, cy, radius, alpha) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, `rgba(25,255,138,${alpha})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function nodePos(node, t, px, py) {
      const wob = 1.25;
      return {
        x: node.x + px + Math.sin(t * 0.85 + node.phase) * wob,
        y: node.y + py + Math.cos(t * 0.85 + node.phase) * wob,
      };
    }

    function pairRevealAlpha(pair, t) {
      if (pair === 0) return ramp(t, 0.2, 1.2);
      if (pair === 1) return ramp(t, 0.8, 1.85);
      return ramp(t, 1.35, 2.45);
    }

    function renderFrame(now, scheduleNext) {
      const t = (now - start) / 1000;

      ctx.clearRect(0, 0, w, h);

      // Central haze
      drawGlow(w * 0.54, h * 0.58, Math.min(w, h) * 0.46, 0.12);

      // Parallax
      const px = (pointer.x - 0.5) * w * 0.03;
      const py = (pointer.y - 0.5) * h * 0.03;

      // Refresh active routes
      if (!reduceMotion && now - lastActiveSwap > 420) {
        lastActiveSwap = now;
        pickActiveEdges();
      }

      // Forward-pass feel
      const cycle = 2.4;
      const p = (t % cycle) / cycle;
      const hotPair = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;

      // Base lines
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (const c of conns) {
        const a = nodes[c.a];
        const b = nodes[c.b];
        const rev = pairRevealAlpha(c.pair, t);
        if (rev <= 0) continue;

        const A = nodePos(a, t, px, py);
        const B = nodePos(b, t, px, py);

        const baseAlpha = rev * (0.05 + (1 - c.weight) * 0.03) * 0.65;

        ctx.strokeStyle = `rgba(25,255,138,${baseAlpha})`;
        ctx.lineWidth = 0.7 + c.weight * 1.4;
        ctx.shadowColor = "rgba(25,255,138,0.18)";
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      // Active lines + traveling dots
      function drawActive(list, pairIdx) {
        const rev = pairRevealAlpha(pairIdx, t);
        if (rev <= 0) return;

        for (const ci of list) {
          const c = conns[ci];
          if (!c) continue;

          const a = nodes[c.a];
          const b = nodes[c.b];
          const A = nodePos(a, t, px, py);
          const B = nodePos(b, t, px, py);

          const pulse = 0.55 + 0.45 * Math.sin(t * 3.8 + c.seed);
          const hotBoost = pairIdx === hotPair ? 1.35 : 1.0;

          const alpha = rev * pulse * 0.22 * hotBoost;

          ctx.strokeStyle = `rgba(25,255,138,${alpha})`;
          ctx.lineWidth = 1.6 + c.weight * 2.8;
          ctx.shadowColor = "rgba(25,255,138,0.45)";
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.stroke();

          const travel = (t * 0.75 + c.seed / (Math.PI * 2)) % 1;
          const tx = A.x + (B.x - A.x) * travel;
          const ty = A.y + (B.y - A.y) * travel;

          ctx.fillStyle = `rgba(25,255,138,${alpha * 0.85})`;
          ctx.shadowBlur = 16;

          ctx.beginPath();
          ctx.arc(tx, ty, 1.9 + c.weight * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawActive(active01, 0);
      drawActive(active12, 1);
      drawActive(active23, 2);

      ctx.restore();

      // Nodes
      const nodesIn = ramp(t, 0.0, 0.65);

      for (const n of nodes) {
        const P = nodePos(n, t, px, py);

        const isEdgeLayer = n.li === 0 || n.li === layers.length - 1;
        const baseR = isEdgeLayer ? 11 : 9;

        const pulse = 0.62 + 0.38 * Math.sin(t * 2.1 + n.pulse);
        const isHot = n.li === hotPair || n.li === hotPair + 1;
        const glow = 0.22 + 0.18 * pulse + (isHot ? 0.18 : 0);

        const r =
          baseR *
          (0.25 + 0.75 * nodesIn) *
          (0.86 + 0.14 * pulse);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        ctx.shadowColor = "rgba(25,255,138,0.85)";
        ctx.shadowBlur = 22 * glow;
        ctx.fillStyle = `rgba(25,255,138,${0.22 * glow})`;

        ctx.beginPath();
        ctx.arc(P.x, P.y, r * 1.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 18 * glow;
        ctx.fillStyle = `rgba(25,255,138,${0.66 + 0.12 * glow})`;

        ctx.beginPath();
        ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.beginPath();
        ctx.arc(
          P.x - r * 0.2,
          P.y - r * 0.2,
          r * 0.42,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      if (scheduleNext) raf = requestAnimationFrame(loop);
    }

    function renderStatic() {
      const fakeNow = start + 4500;
      renderFrame(fakeNow, false);
    }

    let raf = null;
    const start = performance.now();

    function loop(now) {
      renderFrame(now, true);
    }

    if (reduceMotion) {
      renderStatic();
      return () => {
        ro.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
      };
    }

    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }

  // ----------------------------
  // Router render
  // ----------------------------
  const main = qs("#main");

  function setActiveNav(routeId) {
    qsa(".topbar-link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const active = href === `#/` + routeId;
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function renderRoute(routeId) {
    if (!main) return;

    // stop any running typing (new route => new run id)
    typingRunId += 1;

    // stop hero neural net from previous route
    if (stopHeroNeural) {
      stopHeroNeural();
      stopHeroNeural = null;
    }

    // clear any active glow selection
    if (activeGlow) activeGlow.classList.remove("is-active", "is-pulse");
    activeGlow = null;

    const route = ROUTE_MAP.get(routeId) || ROUTE_MAP.get("home");
    const tpl = route ? qs(`#${route.template}`) : null;
    if (!tpl) return;

    document.title = `Abdelrahman Osman — ${route.title}`;

    main.innerHTML = "";
    const node = document.importNode(tpl.content, true);
    const page = document.createElement("div");
    page.className = "page";
    page.appendChild(node);
    main.appendChild(page);

    main.focus({ preventScroll: true });
    requestAnimationFrame(() => page.classList.add("in"));
    window.scrollTo({ top: 0, behavior: "auto" });

    initReveal(main);
    initImageFallbacks(main);
    initContactForm(main);
    startHeroEntranceIfPresent(main);

    // typing only if hero exists
    runTyping(main).catch(() => {});

    // start hero neural net (Home route has the canvas; other routes return null)
    stopHeroNeural = initHeroNeuralNet(main);

    setActiveNav(routeId);
    renderCmdList(cmdInput ? cmdInput.value : "");
  }

  function onRouteChange() {
    const id = getRouteFromHash();
    renderRoute(id);
  }

  // ----------------------------
  // Dynamic Background Canvas
  // ----------------------------
  function initBackground() {
    const canvas = qs("#bgCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });

    let w = 0,
      h = 0,
      dpr = 1;
    let stars = [];
    let glows = [];
    let raf = null;
    let last = performance.now();

    const pointer = { x: 0.5, y: 0.45 };

    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.x = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
        pointer.y = Math.min(1, Math.max(0, e.clientY / window.innerHeight));
      },
      { passive: true }
    );

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.floor((w * h) / 22000);
      const count = Math.max(80, Math.min(180, target));

      stars = Array.from({ length: count }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(0.6, 1.8),
        a: rand(0.1, 0.55),
        vx: rand(-10, 10) / 120,
        vy: rand(-10, 10) / 120,
      }));

      glows = [
        {
          x: w * 0.25,
          y: h * 0.35,
          r: Math.min(w, h) * 0.55,
          vx: 0.06,
          vy: 0.03,
        },
        {
          x: w * 0.62,
          y: h * 0.45,
          r: Math.min(w, h) * 0.45,
          vx: -0.05,
          vy: 0.04,
        },
        {
          x: w * 0.8,
          y: h * 0.3,
          r: Math.min(w, h) * 0.4,
          vx: 0.04,
          vy: -0.05,
        },
      ];
    }

    function drawGlow(gx, gy, gr, intensity) {
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      grad.addColorStop(0, `rgba(25, 255, 138, ${0.08 * intensity})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(0, 0, w, h);

      const px = (pointer.x - 0.5) * 40;
      const py = (pointer.y - 0.5) * 30;

      for (const g of glows) {
        if (!reduceMotion) {
          g.x += g.vx;
          g.y += g.vy;

          if (g.x < -g.r) g.x = w + g.r;
          if (g.x > w + g.r) g.x = -g.r;
          if (g.y < -g.r) g.y = h + g.r;
          if (g.y > h + g.r) g.y = -g.r;
        }
        drawGlow(g.x + px, g.y + py, g.r, 1);
      }

      ctx.save();
      ctx.shadowColor = "rgba(25,255,138,0.50)";
      ctx.shadowBlur = 10;

      for (const s of stars) {
        if (!reduceMotion) {
          s.x += s.vx * (dt * 60);
          s.y += s.vy * (dt * 60);
          if (s.x < -10) s.x = w + 10;
          if (s.x > w + 10) s.x = -10;
          if (s.y < -10) s.y = h + 10;
          if (s.y > h + 10) s.y = -10;
        }

        ctx.fillStyle = `rgba(25,255,138,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;

      const maxD = 140;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i],
            b = stars[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > maxD) continue;
          const alpha = (1 - d / maxD) * 0.1;
          ctx.strokeStyle = `rgba(25,255,138,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      resize();
      if (!raf) raf = requestAnimationFrame(frame);
    }

    let rt = null;
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(rt);
        rt = setTimeout(resize, 120);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!document.hidden && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });

    start();
  }

  // ----------------------------
  // Boot
  // ----------------------------
  function boot() {
    setYear();
    ensureHash();
    renderCmdList("");
    initBackground();
    onRouteChange();
  }

  window.addEventListener("hashchange", onRouteChange);
  window.addEventListener("DOMContentLoaded", boot);
})();





