/**
 * Spanish Starter Pack — Shared Components
 * Injects navbar, footer, and handles theme toggle
 * Include this script in every page
 */

// ============================================
// THEME MANAGER
// ============================================

const ThemeManager = {
  key: "ssp-theme",

  get() {
    return localStorage.getItem(this.key) || "auto";
  },

  set(theme) {
    localStorage.setItem(this.key, theme);
    this.apply(theme);
  },

  apply(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  },

  toggle() {
    const current = this.get();
    const isDark =
      current === "dark" ||
      (current === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    this.set(next);
    return next;
  },

  init() {
    this.apply(this.get());
  },
};

// Apply theme immediately (before DOM to prevent flash)
ThemeManager.init();

// ============================================
// NAVBAR
// ============================================

function renderNavbar(activePage = "") {
  const pages = [
    { href: "index.html", label: "Home", key: "home", className: "home" },
    { href: "lessons.html", label: "Lessons", key: "lessons" },
    { href: "lessons.html", label: "Tips", key: "tips" },
    { href: "contact.html", label: "Contact", key: "contact" },
    {
      href: "Donate.html",
      label: "Donate",
      key: "donate",
      className: "donate",
    },
  ];

  const links = pages
    .map((p) => {
      const cls = [p.className, activePage === p.key ? "active" : ""]
        .filter(Boolean)
        .join(" ");
      return `<a href="${p.href}" class="${cls}">${p.label}</a>`;
    })
    .join("");

  const isDark =
    ThemeManager.get() === "dark" ||
    (ThemeManager.get() === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const themeIcon = isDark ? "☀️" : "🌙";

  const html = `
    <nav class="navbar">
      <a class="logo" href="index.html">Spanish <span>Starter</span> Pack</a>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="theme-toggle" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">
          <span id="theme-icon">${themeIcon}</span>
        </button>
        <button class="menu-toggle" id="menu-toggle" aria-label="Toggle Menu">☰</button>
      </div>
      <div class="nav-links" id="nav-links">
        ${links}
      </div>
    </nav>
  `;

  // Create header element if it doesn't exist
  let header =
    document.querySelector("header") || document.createElement("header");
  header.innerHTML = html;
  if (!document.querySelector("header")) {
    document.body.prepend(header);
  }

  // Attach events
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("nav-links").classList.toggle("show");
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = ThemeManager.toggle();
    const isDarkNow = next === "dark";
    document.getElementById("theme-icon").textContent = isDarkNow ? "☀️" : "🌙";
  });
}

// ============================================
// FOOTER
// ============================================

function renderFooter() {
  const html = `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-column">
          <h3>Spanish Starter Pack</h3>
          <p style="font-size:0.9rem;line-height:1.6;color:rgba(255,255,255,0.5)">
            Free Spanish lessons for everyone. Learn at your own pace.
          </p>
        </div>
        <div class="footer-column">
          <h3>Lessons</h3>
          <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px">
            <li><a href="lessons.html">All Lessons</a></li>
            <li><a href="lessons.html">Basic Introduction</a></li>
            <li><a href="lessons.html">Conjugations</a></li>
            <li><a href="lessons.html">Sentence Structures</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h3>Contact</h3>
          <p style="color:rgba(255,255,255,0.5);font-size:0.9rem">
            Email: <a href="mailto:jmteach15@gmail.com">jmteach15@gmail.com</a>
          </p>
          <p style="margin-top:8px">
            <a href="contact.html" style="color:rgba(200,168,75,0.9)">Book a class →</a>
          </p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Spanish Starter Pack. All rights reserved.</p>
      </div>
    </footer>
  `;

  const footer = document.createElement("div");
  footer.innerHTML = html;
  document.body.appendChild(footer.firstElementChild);
}

// ============================================
// KO-FI WIDGET
// ============================================

function loadKofi() {
  const script = document.createElement("script");
  script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
  script.onload = () => {
    kofiWidgetOverlay.draw("spanishstarterpack", {
      type: "floating-chat",
      "floating-chat.donateButton.text": "Support me",
      "floating-chat.donateButton.background-color": "#c8a84b",
      "floating-chat.donateButton.text-color": "#1a1814",
    });
  };
  document.body.appendChild(script);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = "success", duration = 3500) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ============================================
// AUTO-INIT on DOM Ready
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Get active page from body data attribute or URL
  const activePage = document.body.dataset.page || "";
  renderNavbar(activePage);
  renderFooter();
  loadKofi();
});
