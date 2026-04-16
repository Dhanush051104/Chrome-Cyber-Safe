(function () {
  console.log("✅ CONTENT SCRIPT LOADED — Chrome Cyber Safe is active on this page");

  if (window.__SISTER_SHIELD_ACTIVE__) return;
  window.__SISTER_SHIELD_ACTIVE__ = true;

  let CURRENT_RISK_SCORE = 0;

  // =============================================
  // PART 1 — DOMAIN NORMALIZER
  // Strips protocol, www, subdomains
  // "https://mail.evil-bank.com/login" → "evil-bank.com"
  // =============================================

  function normalizeDomain(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const withoutWww = hostname.replace(/^www\./, "");
      const parts = withoutWww.split(".");
      if (parts.length > 2) {
        return parts.slice(-2).join(".");
      }
      return withoutWww;
    } catch {
      return url;
    }
  }

  // =============================================
  // PART 2 — PANIC BLOCK CHECK
  // Runs FIRST on every page load before any analysis
  // If domain is in panicBlockedDomains → show full-page block
  // =============================================

  function checkIfBlocked() {
    const currentDomain = normalizeDomain(window.location.href);

    chrome.storage.local.get(["panicBlockedDomains"], (data) => {
      const blocked = data.panicBlockedDomains || [];

      if (blocked.includes(currentDomain)) {
        console.log("🚫 Blocked site detected:", currentDomain);
        showPanicBlockScreen(currentDomain);
      } else {
        console.log("✅ Site allowed:", currentDomain);
        // Only proceed with normal analysis if site is NOT blocked
        init();
      }
    });
  }

  function showPanicBlockScreen(domain) {
    // Stop the page from doing anything else
    window.stop();

    // Wipe the page and replace with block screen
    document.documentElement.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Arial, sans-serif;
        background: radial-gradient(circle at top right, rgba(239,68,68,0.12), transparent 30%),
                    radial-gradient(circle at bottom left, rgba(249,115,22,0.08), transparent 30%),
                    linear-gradient(180deg, #020617 0%, #0f172a 100%);
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .block-card {
        width: 100%;
        max-width: 760px;
        background: rgba(15,23,42,0.96);
        border: 1px solid rgba(239,68,68,0.25);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.55);
        position: relative;
        overflow: hidden;
      }
      .top-bar {
        position: absolute; top: 0; left: 0; right: 0; height: 6px;
        background: linear-gradient(90deg, #ef4444, #f97316, #ef4444);
      }
      .icon-row {
        display: flex; align-items: center; gap: 16px; margin-bottom: 20px; margin-top: 8px;
      }
      .shield-icon {
        width: 68px; height: 68px; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-size: 34px;
        background: rgba(239,68,68,0.12);
        border: 1px solid rgba(239,68,68,0.2);
      }
      h1 { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
      .subtitle { font-size: 14px; color: #cbd5e1; }
      .domain-box {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.18);
        border-radius: 18px;
        padding: 18px;
        margin: 18px 0;
        font-size: 14px;
        line-height: 1.7;
        color: #e2e8f0;
      }
      .domain-box strong { color: #fca5a5; font-size: 16px; display: block; margin-bottom: 6px; }
      .domain-name {
        font-family: monospace;
        font-size: 15px;
        color: #fcd34d;
        font-weight: 800;
        word-break: break-all;
      }
      .info-box {
        background: rgba(2,6,23,0.55);
        border: 1px solid #334155;
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 18px;
        font-size: 13px;
        color: #cbd5e1;
        line-height: 1.8;
      }
      .info-box strong { color: #f8fafc; display: block; margin-bottom: 8px; font-size: 14px; }
      .safe-note {
        background: rgba(34,197,94,0.08);
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 14px;
        padding: 14px;
        color: #bbf7d0;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 18px;
      }
      .btn-row { display: flex; gap: 12px; }
      .btn {
        flex: 1; padding: 14px; border: none; border-radius: 14px;
        font-size: 14px; font-weight: 800; cursor: pointer;
      }
      .btn-back { background: #1e293b; color: #fff; border: 1px solid #475569; }
      .btn-danger { background: linear-gradient(90deg, #dc2626, #ef4444); color: #fff; }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = `
      <div class="block-card">
        <div class="top-bar"></div>
        <div class="icon-row">
          <div class="shield-icon">🛡️</div>
          <div>
            <h1>Access Blocked</h1>
            <div class="subtitle">This site was previously flagged and locked by Panic Mode</div>
          </div>
        </div>

        <div class="domain-box">
          <strong>⚠ Blocked Domain</strong>
          <span class="domain-name">${domain}</span>
        </div>

        <div class="info-box">
          <strong>Why is this blocked?</strong>
          You previously triggered Panic Mode on this domain. Chrome Cyber Safe has permanently
          blocked it to prevent re-exposure to the threat.
        </div>

        <div class="safe-note">
          ✅ You are protected. Chrome Cyber Safe stopped this site from loading.
        </div>

        <div class="btn-row">
          <button class="btn btn-back" onclick="history.back()">← Go Back Safely</button>
          <button class="btn btn-danger" id="unblockBtn">Remove Block (Unsafe)</button>
        </div>
      </div>
    `;

    // Unblock button — lets user remove the block if they're sure
    document.getElementById("unblockBtn").addEventListener("click", () => {
      if (confirm(`Are you sure you want to unblock "${domain}"? This may expose you to threats.`)) {
        chrome.storage.local.get(["panicBlockedDomains"], (data) => {
          const updated = (data.panicBlockedDomains || []).filter(d => d !== domain);
          chrome.storage.local.set({ panicBlockedDomains: updated }, () => {
            console.log("⚠ Domain unblocked by user:", domain);
            location.reload();
          });
        });
      }
    });
  }

  // =============================================
  // DEMO TYPE HELPERS
  // =============================================

  function getDemoType() { return document.body?.getAttribute("data-demo-type") || "default"; }
  function isPhishingDemo() { return getDemoType() === "phishing"; }
  function isGmailDemo()    { return getDemoType() === "gmail"; }
  function isSocialDemo()   { return getDemoType() === "social"; }

  function getThreatType() {
    if (isPhishingDemo()) return "Banking Phishing";
    if (isGmailDemo())    return "Email Phishing";
    if (isSocialDemo())   return "Social Media Impersonation";
    return "Unknown Threat";
  }

  function getThreatLabel() {
    if (isPhishingDemo()) return "Banking Phishing";
    if (isGmailDemo())    return "Email Phishing";
    if (isSocialDemo())   return "Photo Misuse / Impersonation Trap";
    return "Suspicious Threat";
  }

  function getThreatBodyText() {
    if (isPhishingDemo()) return "Chrome Cyber Safe detected a suspicious banking verification flow.";
    if (isGmailDemo())    return "Chrome Cyber Safe detected a suspicious email-based phishing flow.";
    if (isSocialDemo())   return "Chrome Cyber Safe detected a social-media impersonation trap.";
    return "Chrome Cyber Safe blocked a suspicious interaction.";
  }

  function getThreatIndicators() {
    if (isPhishingDemo()) return ["Urgency language detected", "Forced verification CTA", "High-risk redirect behavior", "Social engineering pattern"];
    if (isGmailDemo())    return ["Fake internship urgency", "Email-based phishing trigger", "Credential bait behavior", "Repeated source blacklisting"];
    if (isSocialDemo())   return ["Fake account recovery trap", "Manipulated image suspicion", "Suspicious evidence download bait", "Emotion-based social engineering"];
    return ["Suspicious page behavior", "Unknown redirect pattern", "Potential social engineering", "High-risk interaction"];
  }

  // =============================================
  // FEATURE EXTRACTION
  // =============================================

  function extractPageText() {
    const title      = document.title || "";
    const bodyText   = document.body?.innerText || "";
    const buttonText = Array.from(document.querySelectorAll("button, a"))
      .map(el => el.innerText || el.textContent || "").join(" ");
    return `${title} ${bodyText} ${buttonText}`.toLowerCase();
  }

  function countMatches(text, keywords) {
    let count = 0;
    for (const keyword of keywords) { if (text.includes(keyword)) count++; }
    return count;
  }

  function extractFeatureVector() {
    const text = extractPageText();
    const featureVector = [
      countMatches(text, ["urgent", "immediately", "verify now", "action required", "within 20 minutes", "avoid suspension", "suspended"]),
      countMatches(text, ["bank", "banking", "otp", "password", "login", "security alert", "verify"]),
      countMatches(text, ["internship", "job", "offer", "eligibility", "mail", "gmail", "selection"]),
      countMatches(text, ["recover account", "fake account", "impersonation", "photo misuse", "morphed", "manipulated", "reported", "review report"]),
      countMatches(text, ["download", "evidence", ".zip", "attachment", "file", "proof"]),
      document.querySelectorAll("[data-risk-url]").length,
      document.querySelectorAll("[data-morph-risk='true']").length,
      isPhishingDemo() ? 1 : 0,
      isGmailDemo()    ? 1 : 0,
      isSocialDemo()   ? 1 : 0
    ];
    chrome.storage.local.set({ aiFeatureVector: featureVector });
    return featureVector;
  }

  // =============================================
  // BACKEND COMMUNICATION — single source of truth
  // =============================================

  function sendToBackend(features) {
    chrome.runtime.sendMessage(
      { action: "ANALYZE_SITE", features: features },
      (response) => {
        if (response?.success) {
          const backendScore = response.data.score;
          const threat       = response.data.threat;

          console.log("🔥 Backend Score:", backendScore, threat);

          CURRENT_RISK_SCORE = backendScore;

          chrome.storage.local.set({
            aiRiskScore:      backendScore,
            lastRiskScore:    backendScore,
            aiEngine:         "Spring Boot Backend",
            protectionStatus: "ACTIVE"
          });

          updateUIWithBackendScore(backendScore, threat);

        } else {
          console.error("❌ Backend error:", response?.error);
          updateUIWithBackendScore(0, "Backend Unavailable");
        }
      }
    );
  }

  // =============================================
  // UI — renders ONLY after backend responds
  // =============================================

  function updateUIWithBackendScore(score, threat) {
    console.log("🎯 Updating UI with backend score:", score, threat);

    const loader = document.getElementById("ss-loader");
    if (loader) loader.remove();

    const existingBanner = document.getElementById("ss-banner");
    if (existingBanner) existingBanner.remove();

    createTopBanner(score, threat);
    setupRiskElements();
    if (isSocialDemo()) flagMorphedImages();
  }

  // =============================================
  // STYLES
  // =============================================

  function createStyles() {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes ssSpin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ssPulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.25); } 70% { box-shadow: 0 0 0 14px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
      @keyframes ssGlow  { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.15); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0.05); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.15); } }

      /* Banner slide in/out */
      @keyframes ssBannerIn {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0);     opacity: 1; }
      }

      #ss-banner {
        transition: transform 0.4s ease, opacity 0.4s ease;
      }

      #ss-banner.ss-banner-hide {
        transform: translateY(-100%);
        opacity: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // =============================================
  // UI COMPONENTS
  // =============================================

  function createTopLoader() {
    const existing = document.getElementById("ss-loader");
    if (existing) existing.remove();

    const loader = document.createElement("div");
    loader.id = "ss-loader";
    loader.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;background:linear-gradient(90deg,#0f172a,#1e293b);color:white;padding:10px 18px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 2px 12px rgba(0,0,0,0.25);";
    loader.innerHTML = `
      <div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;animation:ssSpin 0.8s linear infinite;flex-shrink:0;"></div>
      <span>🧠 Chrome Cyber Safe is analyzing page risk...</span>
    `;
    document.body.appendChild(loader);
    return loader;
  }

  function createTopBanner(riskScore, threat) {
    // =============================================
    // PART 5 — Auto-hide banner with smooth animation
    // High risk: stays 8s, others: 5s
    // Hover pauses the hide timer
    // =============================================

    const isHigh = riskScore >= 75;
    const bgColor = isHigh
      ? "linear-gradient(90deg,#7f1d1d,#991b1b)"
      : riskScore >= 40
        ? "linear-gradient(90deg,#78350f,#92400e)"
        : "linear-gradient(90deg,#14532d,#166534)";

    const hideDelay = isHigh ? 8000 : 5000;

    const banner = document.createElement("div");
    banner.id = "ss-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 999998;
      background: ${bgColor};
      color: white;
      padding: 12px 18px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      animation: ssBannerIn 0.4s ease forwards;
      cursor: pointer;
    `;

    banner.innerHTML = `
      <span>🛡️ Chrome Cyber Safe • ${threat || "Analysis Complete"}</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="ss-risk-score" style="background:rgba(255,255,255,0.14);padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">
          Risk Score: ${riskScore}
        </span>
        <span id="ss-banner-close" style="font-size:16px;opacity:0.7;cursor:pointer;padding:2px 6px;" title="Dismiss">✕</span>
      </div>
    `;

    document.body.appendChild(banner);

    // Auto-hide logic
    let hideTimer = null;

    function schedulehide() {
      hideTimer = setTimeout(() => {
        banner.classList.add("ss-banner-hide");
      }, hideDelay);
    }

    // Pause on hover
    banner.addEventListener("mouseenter", () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      banner.classList.remove("ss-banner-hide");
    });

    // Resume on mouse leave
    banner.addEventListener("mouseleave", () => {
      schedulehide();
    });

    // Manual dismiss on ✕ click
    banner.querySelector("#ss-banner-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (hideTimer) clearTimeout(hideTimer);
      banner.classList.add("ss-banner-hide");
    });

    // Start the timer
    schedulehide();
  }

  function showBlacklistToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;top:80px;right:20px;z-index:1000002;background:linear-gradient(90deg,#111827,#1f2937);color:white;padding:14px 18px;border-radius:16px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;box-shadow:0 12px 28px rgba(0,0,0,0.25);border:1px solid rgba(239,68,68,0.2);";
    toast.innerHTML = message || "⛔ This phishing source is already blacklisted";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function showQuarantineScreen() {
    const indicators = getThreatIndicators();
    const title      = isSocialDemo() ? "Social Threat Neutralized" : "Threat Neutralized";
    const subtitle   = isSocialDemo()
      ? "Chrome Cyber Safe has isolated this fake social-media threat"
      : "Chrome Cyber Safe has isolated this phishing page";

    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at top right,rgba(239,68,68,0.12),transparent 30%),radial-gradient(circle at bottom left,rgba(249,115,22,0.08),transparent 30%),linear-gradient(180deg,#020617 0%,#0f172a 100%);color:#f8fafc;font-family:Arial,sans-serif;">
        <div style="width:100%;max-width:840px;background:rgba(15,23,42,0.96);border:1px solid rgba(239,68,68,0.22);border-radius:28px;padding:32px;box-shadow:0 24px 70px rgba(0,0,0,0.45);position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#ef4444,#f97316,#ef4444);"></div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:68px;height:68px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:34px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.18);">🛡️</div>
            <div><div style="font-size:30px;font-weight:900;">${title}</div><div style="font-size:14px;color:#cbd5e1;">${subtitle}</div></div>
          </div>
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.16);border-radius:20px;padding:18px;margin-bottom:18px;">
            <div style="font-size:22px;font-weight:800;color:#fecaca;margin-bottom:8px;">⚠ Unsafe Source Locked</div>
            <div style="font-size:14px;line-height:1.8;color:#e2e8f0;">This source has been blocked. A safe browser tab has been opened automatically.</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
            <div style="background:rgba(2,6,23,0.55);border:1px solid #334155;border-radius:18px;padding:16px;">
              <div style="font-weight:800;margin-bottom:8px;">Action Taken</div>
              <ul style="margin:0;padding-left:18px;color:#cbd5e1;line-height:1.8;font-size:14px;"><li>High-risk interaction blocked</li><li>Threat source blacklisted</li><li>Safe tab opened</li><li>User protected before exploitation</li></ul>
            </div>
            <div style="background:rgba(2,6,23,0.55);border:1px solid #334155;border-radius:18px;padding:16px;">
              <div style="font-weight:800;margin-bottom:8px;">Why This Was Flagged</div>
              <ul style="margin:0;padding-left:18px;color:#cbd5e1;line-height:1.8;font-size:14px;"><li>${indicators[0]}</li><li>${indicators[1]}</li><li>${indicators[2]}</li><li>${indicators[3]}</li></ul>
            </div>
          </div>
          <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);border-radius:18px;padding:16px;color:#bbf7d0;font-weight:800;">✅ Protected by Chrome Cyber Safe</div>
        </div>
      </div>
    `;
  }

  function showSisterModal(blockedUrl, mode, riskScore) {
    if (document.getElementById("ss-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "ss-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(2,6,23,0.86);backdrop-filter:blur(8px);z-index:1000001;display:flex;align-items:center;justify-content:center;padding:24px;";

    const indicators   = getThreatIndicators();
    const bodyText     = getThreatBodyText();
    const threatLabel  = getThreatLabel();
    const redirectText = mode === "phishing"
      ? "Opening a safe browser tab and quarantining this threat page..."
      : "Returning safely to the previous page...";

    const card = document.createElement("div");
    card.style.cssText = "width:100%;max-width:760px;background:rgba(15,23,42,0.98);color:#f8fafc;border:1px solid rgba(239,68,68,0.25);border-radius:28px;padding:28px;box-shadow:0 25px 80px rgba(0,0,0,0.55);font-family:Arial,sans-serif;position:relative;overflow:hidden;";

    card.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#ef4444,#f97316,#ef4444);"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:60px;height:60px;border-radius:18px;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;font-size:30px;border:1px solid rgba(239,68,68,0.18);">🛡️</div>
          <div>
            <div style="font-size:26px;font-weight:800;">Chrome Cyber Safe Blocked This</div>
            <div style="font-size:14px;color:#cbd5e1;">${threatLabel}</div>
          </div>
        </div>
        <div style="padding:10px 16px;border-radius:999px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.22);font-size:13px;font-weight:800;color:#fca5a5;">
          Threat Score: ${riskScore} / 100
        </div>
      </div>
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.16);border-radius:20px;padding:18px;margin-bottom:18px;">
        <div style="font-size:24px;font-weight:800;color:#fecaca;margin-bottom:8px;">⚠ Threat Blocked</div>
        <div style="font-size:14px;line-height:1.7;color:#e2e8f0;">${bodyText}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
        <div style="background:rgba(2,6,23,0.55);border:1px solid #334155;border-radius:18px;padding:16px;">
          <div style="font-weight:800;margin-bottom:10px;">Blocked Destination</div>
          <div style="font-size:13px;color:#cbd5e1;word-break:break-word;">${blockedUrl}</div>
        </div>
        <div style="background:rgba(2,6,23,0.55);border:1px solid #334155;border-radius:18px;padding:16px;">
          <div style="font-weight:800;margin-bottom:10px;">Threat Indicators</div>
          <ul style="margin:0;padding-left:18px;color:#cbd5e1;line-height:1.8;font-size:14px;">
            <li>${indicators[0]}</li><li>${indicators[1]}</li><li>${indicators[2]}</li><li>${indicators[3]}</li>
          </ul>
        </div>
      </div>
      <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);border-radius:18px;padding:16px;">
        <div style="font-size:14px;font-weight:800;color:#bbf7d0;margin-bottom:8px;">Safe Response Countdown</div>
        <div id="ss-countdown" style="font-size:32px;font-weight:900;color:#fff;">10</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">${redirectText}</div>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const countdownEl = card.querySelector("#ss-countdown");
    let seconds = 10;
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        if (mode === "phishing") {
          window.open("https://www.google.com", "_blank");
          overlay.remove();
          showQuarantineScreen();
          return;
        }
        overlay.remove();
      }
    }, 1000);
  }

  function showSocialThreatTab(actionName, blockedUrl) {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`<!DOCTYPE html><html><head><title>Chrome Cyber Safe - Threat Blocked</title><meta charset="UTF-8"/><style>body{margin:0;font-family:Arial,sans-serif;background:linear-gradient(180deg,#020617,#0f172a);color:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;}.card{width:100%;max-width:820px;background:rgba(15,23,42,0.96);border:1px solid rgba(239,68,68,0.22);border-radius:28px;padding:32px;position:relative;overflow:hidden;}.bar{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#ef4444,#f97316,#ef4444);}</style></head><body><div class="card"><div class="bar"></div><div style="font-size:30px;font-weight:900;margin-bottom:10px;">🛡️ Chrome Cyber Safe Blocked Social Threat</div><div style="color:#cbd5e1;font-size:14px;margin-bottom:20px;">Action: ${actionName} • Destination: ${blockedUrl}</div><div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);border-radius:18px;padding:16px;color:#bbf7d0;font-weight:800;">✅ Source blacklisted after first detection</div></div></body></html>`);
      newWindow.document.close();
    }
  }

  // =============================================
  // STORAGE
  // =============================================

  function saveBlockedSite(siteUrl, score, sourceType) {
    // Normalize to domain before saving
    const domain = normalizeDomain(siteUrl);
    chrome.storage.local.get(["blockedSites", "threatsBlocked"], (data) => {
      const blockedSites   = data.blockedSites   || [];
      const threatsBlocked = data.threatsBlocked || 0;
      blockedSites.unshift({ url: domain, score: score, time: new Date().toLocaleTimeString(), source: sourceType });
      chrome.storage.local.set({
        blockedSites:    blockedSites.slice(0, 12),
        threatsBlocked:  threatsBlocked + 1,
        lastRiskScore:   score,
        protectionStatus: "ACTIVE"
      });
    });
  }

  // =============================================
  // SOCIAL DEMO
  // =============================================

  function markSocialPageBlacklisted() { chrome.storage.local.set({ socialPageBlacklisted: true }); }
  function isSocialPageBlacklisted(cb) { chrome.storage.local.get(["socialPageBlacklisted"], (d) => { cb(Boolean(d.socialPageBlacklisted)); }); }

  function flagMorphedImages() {
    document.querySelectorAll("[data-morph-risk='true']").forEach((img, index) => {
      const parent = img.parentElement;
      if (!parent || parent.querySelector(".ss-morph-badge")) return;
      img.style.outline = "3px solid rgba(239,68,68,0.95)";
      img.style.outlineOffset = "-3px";
      img.style.animation = "ssGlow 1.8s infinite";
      const badge = document.createElement("div");
      badge.className = "ss-morph-badge";
      badge.textContent = "🧠 AI Flagged: Possible morphed / manipulated image";
      badge.style.cssText = "position:absolute;top:10px;left:10px;z-index:1000000;background:linear-gradient(90deg,#7f1d1d,#991b1b);color:white;padding:8px 12px;border-radius:999px;font-size:11px;font-weight:800;";
      parent.style.position = "relative";
      parent.appendChild(badge);
      if (index === 0) chrome.storage.local.set({ morphDetectionStatus: "AI suspicious visual anomaly detected" });
    });
  }

  function handleSocialAction(actionType, blockedUrl, riskScore, threatType) {
    isSocialPageBlacklisted((alreadyBlacklisted) => {
      if (alreadyBlacklisted) { showBlacklistToast("⛔ This social threat page is already blacklisted"); return; }
      markSocialPageBlacklisted();
      saveBlockedSite(blockedUrl, riskScore, threatType);
      if (actionType === "recover")  { alert("⚠ Fake website detected. Access blocked."); return; }
      if (actionType === "download") { alert("🚫 Download blocked: Invalid file due to threat detection."); return; }
      if (actionType === "review")   { showSocialThreatTab("Review Report", blockedUrl); return; }
      alert("⚠ Suspicious social action blocked.");
    });
  }

  // =============================================
  // RISK ELEMENT WIRING
  // =============================================

  function handleBlacklistAndBlock(riskId, blockedUrl, riskScore, threatType, mode) {
    chrome.storage.local.get(["blacklistedRiskIds"], (data) => {
      const blacklisted = data.blacklistedRiskIds || [];
      if (blacklisted.includes(riskId)) { showBlacklistToast("⛔ This phishing source is already blacklisted"); return; }
      chrome.storage.local.set({ blacklistedRiskIds: [...blacklisted, riskId] }, () => {
        saveBlockedSite(blockedUrl, riskScore, threatType);
        showSisterModal(blockedUrl, mode, riskScore);
      });
    });
  }

  function setupRiskElements() {
    const elements = document.querySelectorAll("[data-risk-url]");
    if (!elements.length) return;

    elements.forEach((el, index) => {
      const blockedUrl   = el.getAttribute("data-risk-url")      || "Suspicious URL";
      const riskId       = el.getAttribute("data-risk-id")       || `risk-${index}`;
      const socialAction = el.getAttribute("data-social-action") || "";
      const threatType   = getThreatType();

      el.style.outline       = "3px solid rgba(239,68,68,0.95)";
      el.style.outlineOffset = "3px";
      el.style.boxShadow     = "0 0 0 6px rgba(239,68,68,0.08)";
      el.style.animation     = "ssPulse 1.8s infinite";

      const tooltip = document.createElement("div");
      tooltip.textContent = "⚠ High Risk Action • Click will be blocked";
      tooltip.style.cssText = "position:fixed;z-index:1000000;background:linear-gradient(90deg,#7f1d1d,#991b1b);color:white;padding:9px 13px;border-radius:12px;font-size:12px;font-weight:700;display:none;pointer-events:none;box-shadow:0 8px 18px rgba(0,0,0,0.28);font-family:Arial,sans-serif;";
      document.body.appendChild(tooltip);

      el.addEventListener("mouseenter", () => {
        const rect = el.getBoundingClientRect();
        tooltip.style.left    = rect.left + "px";
        tooltip.style.top     = Math.max(rect.top - 48, 10) + "px";
        tooltip.style.display = "block";
      });
      el.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        tooltip.style.display = "none";

        const riskScore = CURRENT_RISK_SCORE;

        if (isPhishingDemo()) { saveBlockedSite(blockedUrl, riskScore, threatType); showSisterModal(blockedUrl, "phishing", riskScore); return; }
        if (isGmailDemo())    { handleBlacklistAndBlock(riskId, blockedUrl, riskScore, threatType, "gmail"); return; }
        if (isSocialDemo())   { handleSocialAction(socialAction, blockedUrl, riskScore, threatType); return; }

        saveBlockedSite(blockedUrl, riskScore, threatType);
        showSisterModal(blockedUrl, "gmail", riskScore);
      }, true);
    });
  }

  // =============================================
  // INIT
  // =============================================

  function init() {
    createStyles();
    createTopLoader();
    const features = extractFeatureVector();
    sendToBackend(features);
  }

  // =============================================
  // ENTRY POINT
  // checkIfBlocked runs FIRST — if blocked, shows block screen and stops
  // if NOT blocked, calls init() which runs normal analysis
  // =============================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkIfBlocked);
  } else {
    checkIfBlocked();
  }

  // SPA URL change detection (e.g. Gmail)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("🔄 Page changed, re-analyzing...");
      checkIfBlocked();
    }
  }, 2000);

})();
