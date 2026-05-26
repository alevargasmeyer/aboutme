// "Ask Ale anything" — floating chat widget powered by /api/chat (Claude Haiku).
// No build step. Plain JS. Brutalist visual language matches the rest of the site.
(function () {
  const STORAGE_KEY = "avm-chat-history-v2";
  const RATE_KEY = "avm-chat-count-v2";
  const RATE_RESET_KEY = "avm-chat-reset-v2";
  const PEEK_DISMISS_KEY = "avm-chat-peek-dismissed-v2";
  const MAX_PER_SESSION = 14;
  const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

  // ---- DOM build ----
  const root = document.createElement("div");
  root.id = "avm-chat-root";
  root.innerHTML = `
    <div id="avm-chat-peek" hidden>
      <span>↳ ask me anything</span>
      <button class="close-peek" type="button" aria-label="Dismiss">✕</button>
    </div>
    <button id="avm-chat-bubble" type="button" aria-label="Chat with Ale's AI" aria-expanded="false">
      <span class="dot"></span>
      <span class="label">Ask Ale</span>
      <span class="arrow">↗</span>
    </button>
    <section id="avm-chat-panel" hidden aria-label="Chat with Ale's AI">
      <header class="avm-chat-head">
        <div class="avm-chat-id">
          <span class="avatar">AVM</span>
          <div class="name">
            <strong>Ale Vargas Meyer</strong>
            <span class="sub">AI · trained on my work</span>
          </div>
        </div>
        <button class="avm-chat-close" type="button" aria-label="Close">✕</button>
      </header>
      <div class="avm-chat-log" id="avm-chat-log" role="log" aria-live="polite"></div>
      <form class="avm-chat-form" id="avm-chat-form" autocomplete="off">
        <input type="text" id="avm-chat-input" placeholder="ask anything..." maxlength="500" aria-label="Type your question" />
        <button type="submit" aria-label="Send">→</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const peek = root.querySelector("#avm-chat-peek");
  const peekClose = root.querySelector(".close-peek");
  const bubble = root.querySelector("#avm-chat-bubble");
  const panel = root.querySelector("#avm-chat-panel");
  const closeBtn = root.querySelector(".avm-chat-close");
  const logEl = root.querySelector("#avm-chat-log");
  const form = root.querySelector("#avm-chat-form");
  const input = root.querySelector("#avm-chat-input");

  const STARTERS = [
    "Why are you looking?",
    "GIO sales motion?",
    "Strongest receipt?",
    "Roles I want?",
  ];

  // ---- State ----
  let history = [];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) history = stored.slice(-20);
  } catch {}

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20))); } catch {}
  }

  function rateCount() {
    try {
      const now = Date.now();
      const reset = parseInt(localStorage.getItem(RATE_RESET_KEY) || "0", 10);
      if (!reset || now - reset > RATE_WINDOW_MS) {
        localStorage.setItem(RATE_RESET_KEY, String(now));
        localStorage.setItem(RATE_KEY, "0");
        return 0;
      }
      return parseInt(localStorage.getItem(RATE_KEY) || "0", 10);
    } catch { return 0; }
  }
  function bumpRate() {
    try { localStorage.setItem(RATE_KEY, String(rateCount() + 1)); } catch {}
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function lightMarkdown(s) {
    // Convert **bold** to <strong>, preserve newlines, escape everything else.
    return escapeHTML(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function appendMessage(role, text, opts = {}) {
    const div = document.createElement("div");
    div.className = `avm-msg avm-msg-${role}`;
    if (opts.thinking) {
      div.classList.add("thinking");
      div.innerHTML = `<span class="dots"><span></span><span></span><span></span></span>`;
    } else {
      div.innerHTML = role === "assistant" ? lightMarkdown(text) : escapeHTML(text);
    }
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function appendStarters() {
    const wrap = document.createElement("div");
    wrap.className = "avm-msg-starters";
    wrap.id = "avm-starters";
    STARTERS.forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => {
        wrap.remove();
        input.value = q;
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      });
      wrap.appendChild(b);
    });
    logEl.appendChild(wrap);
  }

  function renderAll() {
    logEl.innerHTML = "";
    if (history.length === 0) {
      appendMessage(
        "assistant",
        "Hey — Ale's AI here, trained on my work. **GIO Sports, Cadena A, @popculture, the receipts.** Ask me anything. If you stump me, I'll send you straight to my email."
      );
      appendStarters();
      return;
    }
    history.forEach((m) => appendMessage(m.role, m.content));
  }

  // ---- Peek tooltip (auto-shows after 4s if user hasn't dismissed it before) ----
  function maybeShowPeek() {
    try { if (localStorage.getItem(PEEK_DISMISS_KEY) === "1") return; } catch {}
    setTimeout(() => {
      if (!panel.hidden) return;
      peek.hidden = false;
      setTimeout(() => { peek.hidden = true; }, 9000);
    }, 4200);
  }
  function dismissPeek() {
    peek.hidden = true;
    try { localStorage.setItem(PEEK_DISMISS_KEY, "1"); } catch {}
  }
  peekClose.addEventListener("click", (e) => { e.stopPropagation(); dismissPeek(); });
  peek.addEventListener("click", () => { dismissPeek(); openPanel(); });

  // ---- UI handlers ----
  function openPanel() {
    panel.hidden = false;
    bubble.setAttribute("aria-expanded", "true");
    bubble.classList.add("open");
    document.body.classList.add("avm-chat-open");
    dismissPeek();
    setTimeout(() => input.focus(), 80);
    renderAll();
  }
  function closePanel() {
    panel.hidden = true;
    bubble.setAttribute("aria-expanded", "false");
    bubble.classList.remove("open");
    document.body.classList.remove("avm-chat-open");
  }
  bubble.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  // ---- Send ----
  async function send(content) {
    // Remove starters once a real message is sent
    const starters = document.getElementById("avm-starters");
    if (starters) starters.remove();

    if (rateCount() >= MAX_PER_SESSION) {
      appendMessage(
        "assistant",
        `That's ${MAX_PER_SESSION} messages — better to talk live. **alevargasmeyer@gmail.com**, I respond fast.`
      );
      return;
    }
    history.push({ role: "user", content });
    persist();
    appendMessage("user", content);
    const thinking = appendMessage("assistant", "", { thinking: true });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      const data = await res.json();
      thinking.remove();
      if (!res.ok) {
        const msg = data?.error || "Chat is offline right now. Email me direct: **alevargasmeyer@gmail.com**.";
        appendMessage("assistant", msg);
        return;
      }
      const reply = (data.reply || "").trim();
      if (!reply) {
        appendMessage("assistant", "Hmm, no answer came back. Try again or email me: **alevargasmeyer@gmail.com**.");
        return;
      }
      history.push({ role: "assistant", content: reply });
      persist();
      bumpRate();
      appendMessage("assistant", reply);
    } catch (err) {
      thinking.remove();
      appendMessage("assistant", "Network glitch. Email me direct: **alevargasmeyer@gmail.com**.");
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });

  // Show peek after first render
  maybeShowPeek();
})();
