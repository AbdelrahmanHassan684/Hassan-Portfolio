/* Genoo-inspired SPA routing + clean, organized interactions
   Works on GitHub Pages (hash routes).
*/
(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  function setYear() {
    const y = new Date().getFullYear();
    const el = qs("[data-year]");
    if (el) el.textContent = String(y);
  }

  function encodeMailto(s) {
    return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  }

  // ----------------------------
  // Route config
  // ----------------------------
  const ROUTES = [
    { id: "home", label: "Home", template: "tpl-home", title: "Home" },
    { id: "about", label: "About", template: "tpl-about", title: "About" },
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
    // hash format: "#/impact"
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
    // Try to autoplay after user interaction
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

    // Add a small open button at bottom-right
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
    } catch (e) {
      // Last-resort: open in new tab
      window.open(src, "_blank", "noopener");
    }
  }

  // Event delegation for media clicks (works across all pages)
  document.addEventListener("click", (e) => {
    const player = e.target.closest(".media-player");
    if (!player) return;
    activateMedia(player);
  });

  document.addEventListener("keydown", (e) => {
    const player = e.target && e.target.closest ? e.target.closest(".media-player") : null;
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
      <rect x='14' y='14' width='${w - 28}' height='${h - 28}' rx='14' ry='14' fill='none' stroke='rgba(0,255,163,0.35)' stroke-width='2'/>
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
      const mailto = `mailto:?subject=${encodeMailto(subject)}&body=${encodeMailto(body)}`;

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
    if (!cmd) return;
    cmd.setAttribute("aria-hidden", "false");
    setTimeout(() => cmdInput && cmdInput.focus(), 30);
  }

  function closeCmd() {
    if (!cmd) return;
    cmd.setAttribute("aria-hidden", "true");
    if (cmdInput) cmdInput.value = "";
    renderCmdList("");
  }

  function renderCmdList(filter) {
    if (!cmdList) return;

    const q = (filter || "").toLowerCase().trim();
    const items = ROUTES.filter((r) => (r.label || "").toLowerCase().includes(q));

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
      cmdList.querySelector('[aria-selected="true"]') || cmdList.querySelector("li[data-go]");
    return selected ? selected.getAttribute("data-go") : null;
  }

  function cmdMoveSelection(dir) {
    if (!cmdList) return;
    const items = qsa("li[data-go]", cmdList);
    if (!items.length) return;

    const i = items.findIndex((x) => x.getAttribute("aria-selected") === "true");
    const cur = i < 0 ? 0 : i;
    const next = Math.max(0, Math.min(items.length - 1, cur + dir));

    items.forEach((x) => x.removeAttribute("aria-selected"));
    items[next].setAttribute("aria-selected", "true");
    items[next].scrollIntoView({ block: "nearest" });
  }

  // Command palette events
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
    }

    // Click outside panel closes
    if (cmd && cmd.getAttribute("aria-hidden") === "false") {
      const panel = e.target.closest(".cmd-panel");
      if (!panel) closeCmd();
    }
  });

  cmdInput?.addEventListener("input", () => renderCmdList(cmdInput.value));

  document.addEventListener("keydown", (e) => {
    // Toggle palette: Ctrl/Meta + K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (cmd?.getAttribute("aria-hidden") === "false") closeCmd();
      else openCmd();
      return;
    }

    // If palette open, it owns keyboard navigation
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
  // Router render
  // ----------------------------
  const main = qs("#main");

  function setActiveNav(routeId) {
    qsa(".nav-link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const active = href === `#/` + routeId;
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function renderRoute(routeId) {
    if (!main) return;

    const route = ROUTE_MAP.get(routeId) || ROUTE_MAP.get("home");
    const tpl = route ? qs(`#${route.template}`) : null;
    if (!tpl) return;

    // Title
    document.title = `Abdelrahman Osman — ${route.title}`;

    // Replace content
    main.innerHTML = "";
    const node = document.importNode(tpl.content, true);
    const page = document.createElement("div");
    page.className = "page";
    page.appendChild(node);
    main.appendChild(page);

    // Focus main for accessibility
    main.focus({ preventScroll: true });

    // Animate page in
    requestAnimationFrame(() => page.classList.add("in"));

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    // Page init
    initReveal(main);
    initImageFallbacks(main);
    initContactForm(main);

    // Set nav state
    setActiveNav(routeId);

    // Rebuild command list selection base
    renderCmdList(cmdInput ? cmdInput.value : "");
  }

  function onRouteChange() {
    const id = getRouteFromHash();
    renderRoute(id);
  }

  // ----------------------------
  // Boot
  // ----------------------------
  function boot() {
    setYear();
    ensureHash();
    renderCmdList("");
    onRouteChange();
  }

  window.addEventListener("hashchange", onRouteChange);
  window.addEventListener("DOMContentLoaded", boot);
})();

