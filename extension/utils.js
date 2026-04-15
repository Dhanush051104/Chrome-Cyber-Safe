(function () {
  const SHORTENER_DOMAINS = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "rb.gy",
    "goo.gl",
    "is.gd",
    "ow.ly",
    "buff.ly"
  ];

  const SUSPICIOUS_DOMAIN_WORDS = [
    "verify",
    "secure",
    "login",
    "account",
    "update",
    "reward",
    "gift",
    "bank",
    "kyc",
    "wallet"
  ];

  const PHISHING_KEYWORDS = [
    "verify now",
    "account suspended",
    "kyc pending",
    "urgent",
    "immediately",
    "claim reward",
    "winner",
    "free gift",
    "secure login",
    "download update",
    "otp",
    "upi",
    "bank account",
    "refund now",
    "confirm now"
  ];

  const SUSPICIOUS_BUTTON_WORDS = [
    "verify now",
    "secure login",
    "claim reward",
    "download now",
    "install update",
    "confirm account"
  ];

  const RISKY_EXTENSIONS = [".exe", ".apk", ".zip", ".msi", ".bat", ".scr"];

  function safeText(str) {
    return (str || "").toString().trim().toLowerCase();
  }

  function countMatches(text, keywords) {
    const t = safeText(text);
    return keywords.reduce((count, keyword) => count + (t.includes(keyword) ? 1 : 0), 0);
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  function isShortener(url) {
    const domain = getDomain(url);
    return SHORTENER_DOMAINS.some(d => domain === d || domain.endsWith("." + d));
  }

  function hasRiskyExtension(url) {
    const lower = safeText(url);
    return RISKY_EXTENSIONS.some(ext => lower.includes(ext));
  }

  function countHyphensInDomain(url) {
    const domain = getDomain(url);
    return (domain.match(/-/g) || []).length;
  }

  function suspiciousDomainWordScore(url) {
    const domain = getDomain(url);
    const count = SUSPICIOUS_DOMAIN_WORDS.reduce((acc, word) => acc + (domain.includes(word) ? 1 : 0), 0);
    return Math.min(count / 3, 1);
  }

  function deceptiveAnchorScore(anchorText, url) {
    const text = safeText(anchorText);
    const domain = getDomain(url);

    if (!text || !domain) return 0;

    const looksLikeDomain = /\b[a-z0-9-]+\.[a-z]{2,}\b/.test(text);
    if (!looksLikeDomain) return 0;

    return text.includes(domain) ? 0 : 1;
  }

  function extractThreatFeatures({ url = "", text = "", anchorText = "", buttonText = "" }) {
    const combinedText = [text, anchorText, buttonText].join(" ").toLowerCase();

    const shortenerScore = isShortener(url) ? 1 : 0;
    const riskyExtScore = hasRiskyExtension(url) ? 1 : 0;
    const hyphenScore = Math.min(countHyphensInDomain(url) / 3, 1);
    const suspiciousDomainScore = suspiciousDomainWordScore(url);

    const phishingKeywordScore = Math.min(countMatches(combinedText, PHISHING_KEYWORDS) / 4, 1);
    const suspiciousButtonScore = Math.min(countMatches(combinedText, SUSPICIOUS_BUTTON_WORDS) / 2, 1);
    const urgencyScore = Math.min(countMatches(combinedText, ["urgent", "immediately", "now", "act fast", "suspended"]) / 3, 1);
    const deceptiveScore = deceptiveAnchorScore(anchorText, url);

    return [
      shortenerScore,
      riskyExtScore,
      hyphenScore,
      suspiciousDomainScore,
      phishingKeywordScore,
      suspiciousButtonScore,
      urgencyScore,
      deceptiveScore
    ];
  }

  function localThreatScore(features) {
    const weights = [0.16, 0.18, 0.10, 0.12, 0.18, 0.10, 0.08, 0.08];
    let total = 0;

    for (let i = 0; i < features.length; i++) {
      total += features[i] * weights[i];
    }

    return Math.min(Math.round(total * 100), 100);
  }

  function classifyThreat(score) {
    if (score >= 65) return "High Risk";
    if (score >= 35) return "Suspicious";
    return "Safe";
  }

  function buildReasons(features) {
    const reasons = [];
    const [
      shortenerScore,
      riskyExtScore,
      hyphenScore,
      suspiciousDomainScore,
      phishingKeywordScore,
      suspiciousButtonScore,
      urgencyScore,
      deceptiveScore
    ] = features;

    if (shortenerScore) reasons.push("Shortened or masked URL detected");
    if (riskyExtScore) reasons.push("Risky downloadable file type detected");
    if (hyphenScore > 0.5) reasons.push("Suspicious domain structure with excessive hyphens");
    if (suspiciousDomainScore > 0.3) reasons.push("Domain contains phishing-like trust words");
    if (phishingKeywordScore > 0.2) reasons.push("Page or link contains phishing-related keywords");
    if (suspiciousButtonScore > 0.2) reasons.push("Suspicious call-to-action button language detected");
    if (urgencyScore > 0.2) reasons.push("Urgency / pressure language detected");
    if (deceptiveScore > 0.5) reasons.push("Displayed link text does not match actual destination");

    if (reasons.length === 0) reasons.push("No strong threat indicators detected");
    return reasons;
  }

  function analyzeThreat(input) {
    const features = extractThreatFeatures(input);
    const score = localThreatScore(features);
    const threatLevel = classifyThreat(score);
    const reasons = buildReasons(features);

    return {
      score,
      threatLevel,
      reasons,
      features
    };
  }

  window.SisterShieldAI = {
    analyzeThreat,
    hasRiskyExtension,
    getDomain
  };
})();