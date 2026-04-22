# Chrome Cyber Safe

**An AI-powered, real-time browser safety extension with a Spring Boot backend — built to detect phishing, social engineering, and online threats before they reach the user.**

---

## What This Project Does

Chrome Cyber Safe is a Chrome Extension (Manifest V3) paired with a Java Spring Boot backend and a MySQL database. Together they form a two-layer threat detection system:

- The **extension** runs inside the browser, collects signals from every webpage the user visits, and sends a feature vector to the backend
- The **backend** scores the threat using a weighted model and cross-references a trusted domains database
- The result is shown in the browser instantly — without the user having to do anything

The extension also includes a **Panic Mode** that permanently blocks a domain across sessions, and an **Emergency Mode** that opens India's national cybercrime reporting portal immediately.

---

## Architecture

```
User visits a website
        │
        ▼
  content.js (extension)
  ├── Checks panicBlockedDomains (chrome.storage.local)
  │     └── If blocked → shows full-page block screen, stops
  │
  └── Extracts feature vector from page content
        │
        ▼
  background.js (service worker)
        │
        ▼
  Spring Boot Backend (localhost:8080)
  ├── POST /api/analyze
  │     ├── Checks MySQL trusted_domains table
  │     ├── Applies weighted scoring model
  │     └── Returns { score, threat }
  │
  └── POST /api/blacklist
        └── Adds domain to MySQL blacklist_domains table
        │
        ▼
  content.js receives score
        │
        ▼
  UI renders banner (auto-hides after 5–8 seconds)
```

---

## Project Structure

```
Chrome-Cyber-Safe/
│
├── extension/                  ← Chrome Extension (frontend)
│   ├── manifest.json           ← MV3 config, permissions
│   ├── content.js              ← Runs on every webpage
│   │                             Feature extraction, UI injection,
│   │                             panic block check, risk elements
│   ├── background.js           ← Service worker
│   │                             Backend communication, panic mode,
│   │                             emergency mode, domain normalization
│   ├── popup.html              ← Extension popup UI
│   ├── popup.js                ← Popup dashboard logic
│   ├── popup.css               ← Popup styles
│   ├── blocked.html            ← Full-page blocked screen (static)
│   ├── emergency.html          ← Emergency resources page
│   └── utils.js                ← Shared utility functions
│
└── backend/                    ← Spring Boot backend (Java 17)
    └── src/main/java/com/cybersafe/backend/
        ├── BackendApplication.java   ← Spring Boot entry point
        └── RiskController.java       ← All API endpoints
```

---

## Features

### Real-Time Threat Detection
Every page the user visits is automatically analyzed. The extension extracts 10 signals from the page — urgency keywords, banking terms, phishing language, suspicious download indicators, risky UI elements, and more — and sends them to the backend as a feature vector.

### Weighted Risk Scoring (Backend)
The Spring Boot backend applies a weighted scoring model where each feature has a different importance level. Combination bonuses apply when multiple high-risk signals co-occur (e.g., urgency language + banking keywords together adds extra weight). The score is returned as 0–100 with a threat label: Safe, Suspicious, or High Risk.

### Trusted Domain Whitelist (MySQL)
A `trusted_domains` table in MySQL is checked on every analysis request. If the current site's domain matches a trusted entry, it immediately returns a score of 5 (Safe) without running any further scoring.

### Persistent Panic Mode
When the user clicks Panic Mode:
- The current domain is normalized (strips protocol, www, subdomains) and stored in `chrome.storage.local` under `panicBlockedDomains`
- The current tab is closed immediately
- Every future visit to that domain — regardless of path or subdomain — is intercepted at page load, the page is stopped with `window.stop()`, and a full-page block screen is shown
- The block persists across browser restarts
- Users can optionally unblock a domain from the block screen

### Emergency Mode
One click opens `cybercrime.gov.in` (India's National Cyber Crime Reporting Portal) in a new tab and logs the event with a timestamp and current page context.

### Auto-Hide Risk Banner
After every analysis, a color-coded banner appears at the top of the page:
- Green for Safe, Amber for Suspicious, Red for High Risk
- High Risk banners stay visible for 8 seconds, others for 5 seconds
- Hovering over the banner pauses the hide timer
- A manual dismiss button (✕) is available
- The banner slides out smoothly using CSS transitions and does not permanently block page content

### Domain Blacklist API
The backend exposes `POST /api/blacklist` which stores a domain in the MySQL `blacklist_domains` table for future cross-referencing and logging purposes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | JavaScript (MV3), HTML, CSS |
| Service Worker | Chrome Extension Background Script |
| Backend | Java 17, Spring Boot |
| Database | MySQL |
| Storage (local) | chrome.storage.local |
| Communication | chrome.runtime.sendMessage → fetch → REST API |

---

## API Endpoints

### `GET /api/test`
Health check. Returns a plain text confirmation that the backend is running.

### `POST /api/analyze`
Receives a feature vector and returns a risk score.

**Request:**
```json
{
  "features": [1, 0, 2, 0, 1, 0, 0, 0, 0, 0],
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "score": 65,
  "threat": "Suspicious"
}
```

### `POST /api/blacklist`
Adds a domain to the MySQL blacklist table.

**Request:**
```json
{
  "domain": "evil-phishing-site.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Domain added to blacklist"
}
```

---

## Feature Vector

The extension extracts a 10-element integer feature vector from each page:

| Index | Signal |
|---|---|
| 0 | Urgency keyword count (urgent, verify now, suspended…) |
| 1 | Banking keyword count (bank, OTP, UPI, login…) |
| 2 | Email scam keyword count (internship, eligibility, offer…) |
| 3 | Social engineering keyword count (impersonation, morphed…) |
| 4 | Download bait keyword count (.zip, evidence, attachment…) |
| 5 | Count of elements with `data-risk-url` attribute |
| 6 | Count of elements with `data-morph-risk` attribute |
| 7 | Is phishing demo page (1/0) |
| 8 | Is Gmail demo page (1/0) |
| 9 | Is social demo page (1/0) |

---

## Database Schema

```sql
-- Trusted domains (always return Safe score)
CREATE TABLE trusted_domains (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE
);

-- Global domain blacklist (for future cross-user blocking)
CREATE TABLE blacklist_domains (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  domain    VARCHAR(255) NOT NULL UNIQUE,
  added_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## How to Run

### Backend

Prerequisites: Java 17, Maven, MySQL running on port 3306

```bash
# Create the database
mysql -u root -p
CREATE DATABASE cybersafe;
USE cybersafe;
# Run the schema above

# Start the backend
cd backend
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080`

### Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load Unpacked**
4. Select the `extension/` folder inside this project
5. The extension icon will appear in the Chrome toolbar

Make sure the Spring Boot backend is running before using the extension — without it, the extension shows "Backend Unavailable" in the banner.

---

## Storage Architecture

| Storage | What is stored | Purpose |
|---|---|---|
| `chrome.storage.local` → `panicBlockedDomains` | Normalized domains (e.g. `evil.com`) | Persistent panic blocks, checked on every page load |
| `chrome.storage.local` → `blockedSites` | Recent blocked site records | Popup dashboard display |
| `chrome.storage.local` → `panicLogs` | Panic event history | Audit trail |
| `chrome.storage.local` → `emergencyLogs` | Emergency event history | Audit trail |
| MySQL → `trusted_domains` | Whitelisted domains | Backend safe-list |
| MySQL → `blacklist_domains` | Globally blacklisted domains | Backend block-list, future use |

The separation is intentional. Panic blocking uses `chrome.storage.local` so it works instantly without a network call. The database is reserved for global/shared threat intelligence that does not need to be instant.

---

## Known Limitations

- Backend must be running locally — there is no cloud deployment yet
- The scoring model uses a static weight array; it is not machine-learned
- `panicBlockedDomains` is per-browser-profile (not synced across devices)
- The extension does not yet check MySQL `blacklist_domains` on page load — only `panicBlockedDomains` from local storage is checked

---

## Planned Improvements

- Train a proper ML model on labeled phishing datasets and replace the static weight array
- Deploy the Spring Boot backend to a cloud server (Railway or Render) so it does not require local setup
- Sync `panicBlockedDomains` to the MySQL `blacklist_domains` table so blocks are recorded server-side
- Add a page-load check against the MySQL blacklist (not just local storage)
- Add user authentication so threat logs are tied to individual users
- Export blocked threats as a downloadable report from the popup

---

## Author

Built by **Dhanush (DVK)** as an independent cybersecurity infrastructure project.

Backend, extension architecture, panic mode persistence system, domain normalization logic, auto-hide banner UX, and secure API proxy design are original contributions.

---

## License

MIT License. Free to use, modify, and distribute with attribution.
