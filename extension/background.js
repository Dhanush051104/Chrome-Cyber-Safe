// Chrome Cyber Safe — background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Cyber Safe background service worker active");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "TEST_BACKEND") {
    fetch("http://localhost:8080/api/test")
      .then(res => res.text())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.toString() });
      });
    return true;
  }

  if (message.action === "panicMode") {
    handlePanicMode(sendResponse);
    return true;
  }

  if (message.action === "emergencyMode") {
    handleEmergencyMode(sendResponse);
    return true;
  }

  if (message.action === "ANALYZE_SITE") {
  fetch("http://localhost:8080/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      features: message.features
    })
  })
    .then(res => res.json())
    .then(data => {
      sendResponse({ success: true, data: data });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.toString() });
    });

  return true;
  }

});

// =============================================
// PANIC MODE
// =============================================

function handlePanicMode(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) {
      sendResponse({ success: false, error: "No active tab found" });
      return;
    }

    const activeTab = tabs[0];

    const threatLog = {
      url: activeTab.url || "Unknown URL",
      title: activeTab.title || "Unknown Page",
      time: new Date().toLocaleString(),
      riskScore: 100,
      threatType: detectThreatType(activeTab),
      mode: "panic_mode_triggered"
    };

    chrome.storage.local.get(["panicLogs", "blockedSites", "threatsBlocked"], (data) => {
      const panicLogs = data.panicLogs || [];
      const blockedSites = data.blockedSites || [];
      const threatsBlocked = data.threatsBlocked || 0;

      panicLogs.unshift(threatLog);
      blockedSites.unshift({
        url: threatLog.url,
        score: 100,
        time: new Date().toLocaleTimeString(),
        source: "Panic Mode Threat Lock"
      });

      chrome.storage.local.set(
        {
          panicLogs: panicLogs.slice(0, 10),
          blockedSites: blockedSites.slice(0, 12),
          threatsBlocked: threatsBlocked + 1,
          lastRiskScore: 100,
          protectionStatus: "PANIC MODE ACTIVATED",
          lastPanicEvent: threatLog
        },
        () => {
          chrome.tabs.remove(activeTab.id, () => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            sendResponse({ success: true, message: "Panic Mode activated" });
          });
        }
      );
    });
  });
}

// =============================================
// EMERGENCY MODE
// =============================================

function handleEmergencyMode(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs.length ? tabs[0] : null;

    const emergencyLog = {
      time: new Date().toLocaleString(),
      url: activeTab?.url || "Unknown URL",
      title: activeTab?.title || "Unknown Page",
      action: "Opened National Cyber Crime Reporting Portal",
      type: "emergency_mode_triggered"
    };

    chrome.storage.local.get(["emergencyLogs"], (data) => {
      const emergencyLogs = data.emergencyLogs || [];
      emergencyLogs.unshift(emergencyLog);

      chrome.storage.local.set(
        {
          emergencyLogs: emergencyLogs.slice(0, 10),
          lastEmergencyEvent: emergencyLog,
          protectionStatus: "EMERGENCY MODE ACTIVATED"
        },
        () => {
          chrome.tabs.create({ url: "https://cybercrime.gov.in/" }, () => {
            sendResponse({ success: true, message: "Emergency Mode activated" });
          });
        }
      );
    });
  });
}

// =============================================
// HELPER
// =============================================

function detectThreatType(tab) {
  const url = (tab.url || "").toLowerCase();
  const title = (tab.title || "").toLowerCase();

  if (url.includes("bank") || title.includes("bank")) return "Banking Phishing";
  if (url.includes("mail") || title.includes("gmail") || title.includes("internship")) return "Email Scam / Phishing";
  if (url.includes("instagram") || title.includes("instagram") || title.includes("photo misuse")) return "Social Media Impersonation";

  return "Suspicious Session";
}
