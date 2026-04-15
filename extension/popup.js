let currentDisplayedRisk = 0;
let riskAnimationInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("SHELTER popup loaded");

  loadDashboard();

  // Live listen for storage changes
  chrome.storage.onChanged.addListener(handleStorageChanges);

  const panicBtn = document.getElementById("panicBtn");
  const emergencyBtn = document.getElementById("emergencyBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (panicBtn) {
    panicBtn.addEventListener("click", () => {
      panicBtn.disabled = true;
      panicBtn.textContent = "⚠ Activating...";

      chrome.runtime.sendMessage({ action: "panicMode" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Panic Mode error:", chrome.runtime.lastError);
          showToast("❌ Panic Mode failed");
          panicBtn.disabled = false;
          panicBtn.textContent = "🚨 Panic Mode";
          return;
        }

        if (response && response.success) {
          showToast("⚠ Panic Mode Activated • Threat locked");
          setTimeout(() => window.close(), 800);
        } else {
          showToast("❌ Panic Mode failed");
          panicBtn.disabled = false;
          panicBtn.textContent = "🚨 Panic Mode";
        }
      });
    });
  }

  if (emergencyBtn) {
    emergencyBtn.addEventListener("click", () => {
      emergencyBtn.disabled = true;
      emergencyBtn.textContent = "🆘 Preparing...";

      chrome.runtime.sendMessage({ action: "emergencyMode" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Emergency Mode error:", chrome.runtime.lastError);
          showToast("❌ Emergency Mode failed");
          emergencyBtn.disabled = false;
          emergencyBtn.textContent = "🆘 Emergency Mode";
          return;
        }

        if (response && response.success) {
          showToast("🆘 Emergency Mode Activated");
          setTimeout(() => {
            emergencyBtn.disabled = false;
            emergencyBtn.textContent = "🆘 Emergency Mode";
          }, 1000);
        } else {
          showToast("❌ Emergency Mode failed");
          emergencyBtn.disabled = false;
          emergencyBtn.textContent = "🆘 Emergency Mode";
        }
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      chrome.storage.local.clear(() => {
        currentDisplayedRisk = 0;
        updateRiskUI(0);
        setText("statusText", "ACTIVE");
        setText("threatCount", "0");
        renderBlockedList([]);
        renderPanicInfo(null, null);
        showToast("♻ Demo state reset");
      });
    });
  }
});

window.addEventListener("beforeunload", () => {
  if (riskAnimationInterval) clearInterval(riskAnimationInterval);
  chrome.storage.onChanged.removeListener(handleStorageChanges);
});

function loadDashboard() {
  chrome.storage.local.get(
    [
      "protectionStatus",
      "threatsBlocked",
      "lastRiskScore",
      "blockedSites",
      "lastPanicEvent",
      "lastEmergencyEvent"
    ],
    (data) => {
      console.log("SHELTER popup storage data:", data);

      setText("statusText", data.protectionStatus || "ACTIVE");
      setText("threatCount", String(data.threatsBlocked || 0));

      const risk = Number(data.lastRiskScore || 0);
      animatePopupRisk(risk);

      renderBlockedList(data.blockedSites || []);
      renderPanicInfo(data.lastPanicEvent || null, data.lastEmergencyEvent || null);
    }
  );
}

function handleStorageChanges(changes, areaName) {
  if (areaName !== "local") return;

  console.log("SHELTER storage changed:", changes);

  if (changes.protectionStatus) {
    setText("statusText", changes.protectionStatus.newValue || "ACTIVE");
  }

  if (changes.threatsBlocked) {
    setText("threatCount", String(changes.threatsBlocked.newValue || 0));
  }

  if (changes.lastRiskScore) {
    const target = Number(changes.lastRiskScore.newValue || 0);
    animatePopupRisk(target);
  }

  if (changes.blockedSites) {
    renderBlockedList(changes.blockedSites.newValue || []);
  }

  const panicEvent = changes.lastPanicEvent ? changes.lastPanicEvent.newValue : undefined;
  const emergencyEvent = changes.lastEmergencyEvent ? changes.lastEmergencyEvent.newValue : undefined;

  if (changes.lastPanicEvent || changes.lastEmergencyEvent) {
    chrome.storage.local.get(["lastPanicEvent", "lastEmergencyEvent"], (data) => {
      renderPanicInfo(
        panicEvent !== undefined ? panicEvent : (data.lastPanicEvent || null),
        emergencyEvent !== undefined ? emergencyEvent : (data.lastEmergencyEvent || null)
      );
    });
  }
}

function animatePopupRisk(target) {
  const riskEl = document.getElementById("riskValue");
  if (!riskEl) {
    console.error("riskValue element not found");
    return;
  }

  // Reset properly if cleared
  if (target === 0) {
    if (riskAnimationInterval) {
      clearInterval(riskAnimationInterval);
      riskAnimationInterval = null;
    }
    currentDisplayedRisk = 0;
    updateRiskUI(0);
    return;
  }

  // If already same
  if (target === currentDisplayedRisk) {
    updateRiskUI(currentDisplayedRisk);
    return;
  }

  // If target smaller, snap down
  if (target < currentDisplayedRisk) {
    if (riskAnimationInterval) {
      clearInterval(riskAnimationInterval);
      riskAnimationInterval = null;
    }
    currentDisplayedRisk = target;
    updateRiskUI(currentDisplayedRisk);
    return;
  }

  // Stop old animation
  if (riskAnimationInterval) {
    clearInterval(riskAnimationInterval);
    riskAnimationInterval = null;
  }

  riskAnimationInterval = setInterval(() => {
    currentDisplayedRisk += Math.ceil((target - currentDisplayedRisk) / 5);

    if (currentDisplayedRisk >= target) {
      currentDisplayedRisk = target;
      clearInterval(riskAnimationInterval);
      riskAnimationInterval = null;
    }

    updateRiskUI(currentDisplayedRisk);
  }, 80);
}

function updateRiskUI(value) {
  const riskEl = document.getElementById("riskValue");
  if (riskEl) {
    riskEl.textContent = String(value);
  }
}

function renderBlockedList(blockedSites) {
  const blockedList = document.getElementById("blockedList");
  if (!blockedList) return;

  blockedList.innerHTML = "";

  if (!blockedSites || !blockedSites.length) {
    blockedList.innerHTML = `<div class="emptyText">No blocked threats yet</div>`;
    return;
  }

  blockedSites.slice(0, 5).forEach((site) => {
    const item = document.createElement("div");
    item.style.background = "rgba(15,23,42,0.75)";
    item.style.border = "1px solid #334155";
    item.style.borderRadius = "12px";
    item.style.padding = "10px";
    item.style.marginBottom = "8px";
    item.style.fontSize = "12px";
    item.style.color = "#e2e8f0";

    item.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(site.source || "Threat Blocked")}</div>
      <div style="color:#94a3b8;word-break:break-word;">${escapeHtml(site.url || "Unknown URL")}</div>
      <div style="margin-top:4px;color:#fca5a5;">Risk: ${Number(site.score || 0)}</div>
    `;

    blockedList.appendChild(item);
  });
}

function renderPanicInfo(lastPanicEvent, lastEmergencyEvent) {
  const panicInfo = document.getElementById("panicInfo");
  if (!panicInfo) return;

  let html = `<div class="emptyText">No emergency events yet</div>`;

  if (lastPanicEvent) {
    html = `
      <div style="font-size:12px;color:#fecaca;font-weight:700;">Last Panic Event</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">
        ${escapeHtml(lastPanicEvent.threatType || "Suspicious Session")}
      </div>
    `;
  }

  if (lastEmergencyEvent) {
    html += `
      <div style="margin-top:8px;font-size:12px;color:#fde68a;font-weight:700;">Last Emergency Action</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">
        ${escapeHtml(lastEmergencyEvent.action || "Cybercrime portal opened")}
      </div>
    `;
  }

  panicInfo.innerHTML = html;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = String(value);
  } else {
    console.error(`Element with id "${id}" not found`);
  }
}

function showToast(message) {
  const existing = document.getElementById("popupToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "popupToast";
  toast.style.position = "fixed";
  toast.style.bottom = "14px";
  toast.style.left = "14px";
  toast.style.right = "14px";
  toast.style.zIndex = "99999";
  toast.style.background = "linear-gradient(90deg, #111827, #1f2937)";
  toast.style.color = "white";
  toast.style.padding = "12px 14px";
  toast.style.borderRadius = "12px";
  toast.style.fontSize = "12px";
  toast.style.fontWeight = "700";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.25)";
  toast.style.border = "1px solid rgba(239,68,68,0.2)";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}