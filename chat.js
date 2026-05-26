// "Ask Ale anything" — floating chat widget powered by /api/chat (Claude Haiku).
// No build step. Plain JS. Brutalist visual language matches the rest of the site.
(function () {
  const STORAGE_KEY = "avm-chat-history-v1";
  const RATE_KEY = "avm-chat-count-v1";
  const RATE_RESET_KEY = "avm-chat-reset-v1";
  const MAX_PER_SESSION = 12;
  const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

  // ---- DOM build ----
  const root = document.createElement("div");
  root.id = "avm-chat-root";
  root.innerHTML = `
    <button id="avm-chat-bubble" type="button" aria-label="Chat with Ale's AI" aria-expanded="false">
      <span class="dot"></span>
      <span class="label">Ask <strong>Ale</strong> anything</span>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M4 4h16v12H7l-3 3V4z"/>
      </svg>
    </button>
    <section id="avm-chat-panel" hidden aria-label="Chat with Ale">
      <header class="avm-chat-head">
        <div class="avm-chat-id">
          <span class="avatar">AV</span>
          <div>
            <strong>Ale Vargas Meyer</strong>
            <span class="sub">↳ AI · trained on my work</span>
          </div>
        </div>
        <button class="avm-chat-close" type="button" aria-label="Close chat">✕</button>
      </header>
      <div class="avm-chat-log" id="avm-chat-log" role="log" aria-live="polite"></div>
      <div class="avm-chat-suggestions" id="avm-chat-suggestions">
        <button data-q="Why are you looking for a new role?">Why are you looking?</button>
        <button data-q="Walk me through the GIO Sports sales motion.">GIO sales motion</button>
        <button data-q="What's your strongest sales receipt?">Strongest receipt</button>
        <button data-q="What roles are you targeting?">Roles I want</button>
      </div>
      <form class="avm-chat-form" id="avm-chat-form" autocomplete="off">
        <input type="text" id="avm-chat-input" placeholder="Ask anything..." maxlength="500" aria-label="Type your question" />
        <button type="submit" aria-label="Send">→</button>
      </form>
      <p class="avm-chat-note">↳ Real Claude · responses are AI-generated · for live chat: <a href="mailto:alevargasmeyer@gmail.com">alevargasmeyer@gmail.com</a></p>
    </section>
  `;
  document.body.appendChild(root);

  const bubble = root.querySelector("#avm-chat-bubble");
  const panel = root.querySelector("#avm-chat-panel");
  const closeBtn = root.querySelector(".avm-chat-close");
  const logEl = root.querySelector("#avm-chat-log");
  const form = root.querySelector("#avm-chat-form");
  const input = root.querySelector("#avm-chat-input");
  const suggestionBtns = root.querySelectorAll(".avm-chat-suggestions button");

  // ---- State ----
  let history = []; // [{ role: 'user' | 'assistant', content: string }]
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
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderMessage(role, text, opts = {}) {
    const div = document.createElement("div");
    div.className = `avm-msg avm-msg-${role}`;
    if (opts.thinking) div.classList.add("thinking");
    div.innerHTML = opts.thinking
      ? `<span class="dots"><span></span><span></span><span></span></span>`
      : escapeHTML(text).replace(/\n/g, "<br>");
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function renderAll() {
    logEl.innerHTML = "";
    if (history.length === 0) {
      renderMessage(
        "assistant",
        "Hey — I'm Ale's AI. I can answer questions about GIO Sports, Cadena A, the work, the receipts, and what I'm looking for next. Pick one below or type your own."
      );
      return;
    }
    history.forEach((m) => renderMessage(m.role, m.content));
  }

  // ---- UI handlers ----
  function openPanel() {
    panel.hidden = false;
    bubble.setAttribute("aria-expanded", "true");
    document.body.classList.add("avm-chat-open");
    setTimeout(() => input.focus(), 60);
    renderAll();
  }
  function closePanel() {
    panel.hidden = true;
    bubble.setAttribute("aria-expanded", "false");
    document.body.classList.remove("avm-chat-open");
  }
  bubble.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closePanel(); });

  suggestionBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      input.value = btn.dataset.q || btn.textContent;
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    })
  );

  // ---- Send ----
  async function send(content) {
    if (rateCount() >= MAX_PER_SESSION) {
      renderMessage(
        "assistant",
        `That's ${MAX_PER_SESSION} messages — I'd rather we talk live. Drop me a note: alevargasmeyer@gmail.com.`
      );
      return;
    }
    history.push({ role: "user", content });
    persist();
    renderMessage("user", content);
    const thinking = renderMessage("assistant", "", { thinking: true });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      const data = await res.json();
      thinking.remove();
      if (!res.ok) {
        const msg = data?.error || "Chat is offline right now. Drop me an email: alevargasmeyer@gmail.com.";
        renderMessage("assistant", msg);
        return;
      }
      const reply = (data.reply || "").trim();
      if (!reply) {
        renderMessage("assistant", "Hmm, no answer came back. Try a more specific question, or email me: alevargasmeyer@gmail.com.");
        return;
      }
      history.push({ role: "assistant", content: reply });
      persist();
      bumpRate();
      renderMessage("assistant", reply);
    } catch (err) {
      thinking.remove();
      renderMessage("assistant", "Network glitch. Email me directly: alevargasmeyer@gmail.com.");
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });
})();
