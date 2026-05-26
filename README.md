# ⚖ Fine Print Decoder

> **Open any Terms & Conditions page. Gemini 3.5 Flash reads the fine print.**
> Red flags, hidden clauses, and a plain-English trust score — in 8 seconds.

<div align="center">

[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest_V3-14b8a6?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Gemini AI](https://img.shields.io/badge/Gemini-3.5_Flash-D4AF37?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Streak](https://img.shields.io/badge/Day-12_/_180-teal?style=for-the-badge&logo=github&logoColor=white)](https://x.com/happy_ships)

</div>

---

## 📖 The Problem & The Solution

Nobody reads Terms & Conditions. That's by design — legal teams write them to be long, dense, and deliberately hard to parse. The average ToS is 8,000 words. Reading it properly takes 30 minutes. Nobody does it.

The result: people unknowingly agree to data selling, binding arbitration, retroactive pricing changes, and contact list access every day.

**Fine Print Decoder** fixes this. Navigate to any Terms of Service, Privacy Policy, or EULA page, click once, and Gemini 3.5 Flash returns a structured legal X-ray:

- A **Trust Score** from 0–100
- A **Verdict** (Safe / Caution / Danger) with a one-sentence reason
- **🚩 Red Flags** — clauses that directly harm you
- **⚠ Hidden Clauses** — terms buried where nobody looks
- **📋 Plain Summary** — what you're actually agreeing to, in plain English

![Demo](demo.gif)

---

## ⚡ Core Features

- 🔍 **Legal X-Ray UI** — Animated scan line sweeps a document graphic while Gemini reads. No spinner — an actual visual metaphor for what's happening.
- 📊 **Animated Trust Score** — SVG ring counts up from 0 to the final score. Red for Danger, Amber for Caution, Teal for Safe.
- 🃏 **Staggered Insight Cards** — Red Flags, Hidden Clauses, and Plain Summary cards slide in with staggered delays, color-coded by severity.
- 🪟 **In-Page Popup Detection** — Detects open modals and dialogs (`dialog[open]`, `[role="dialog"]`, OneTrust, Cookiebot, Bootstrap) and reads the T&C text directly from them — no need to navigate to a separate page.
- 🎛 **Model Selector** — Switch between Gemini 3.5 Flash, 2.5 Flash, and 2.0 Flash in Settings.
- 🔄 **10-Minute Session Cache** — Reopen the popup and your last analysis is instantly restored.
- ✕ **Reset Button** — Clear the result and return to idle without re-analyzing.
- ☁ **OpenRouter Fallback** — Automatically falls back to OpenRouter if Gemini quota is hit.

---

## 🛠 Getting Started

### 1. Get a Gemini API Key (free)
1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy the key (starts with `AIza...`)

### 2. Load the Extension
1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Toggle on **Developer mode** (top-right)
4. Click **Load unpacked** → select the `fine-print-decoder` folder

### 3. First Launch
On first open, paste your **Gemini API Key** (or an OpenRouter key — either works) and click **Start Decoding →**.

### 4. Decode Any Page
1. Navigate to any Terms of Service, Privacy Policy, or EULA page
2. Click the ⚖ extension icon in your toolbar
3. Click **⚖ Decode This Page**
4. If the T&C is in an on-page popup, keep the popup open before clicking Decode

---

## 🧠 Engineering Highlight: Gemini 3.5 Flash Thinking Mode

Gemini 3.5 Flash enables **thinking by default** — it returns a reasoning trace part *before* the actual answer part. The `candidates[0].content.parts` array looks like:

```json
[
  { "thought": true, "text": "Let me analyze this document..." },
  { "text": "{\"score\": 23, \"verdict\": \"Danger\", ...}" }
]
```

Reading `parts[0].text` — the standard pattern from all Gemini 2.x code — grabs the thinking chunk, not the JSON. The result: `JSON.parse` fails and the user sees an error.

The fix is two-pronged:
1. **Disable thinking** (`thinkingConfig: { thinkingBudget: 0 }`) — for structured JSON output we don't need the reasoning trace and it wastes tokens.
2. **Filter by `!part.thought`** as a fallback — finds the first non-thought part in case the config is ignored.

```js
const parts = data?.candidates?.[0]?.content?.parts || [];
const answerPart = parts.find(p => !p.thought) || parts[0];
return answerPart?.text || '';
```

> [!NOTE]
> This affects any project using Gemini 3.5 Flash that expects clean text output. The `parts[0]` pattern that worked in Gemini 2.x silently breaks in 3.5 Flash with thinking enabled.

---

## 🔧 Technical Stack

- **Extension Framework**: Chrome Extension Manifest V3
- **Primary AI Model**: Gemini 3.5 Flash via `generativelanguage.googleapis.com` (Google I/O 2026)
- **Fallback Engine**: OpenRouter API (Gemini 2.5 Flash → DeepSeek → Llama 3.3)
- **Page Extraction**: `chrome.scripting.executeScript` — no persistent content script
- **Modal Detection**: `dialog[open]`, `[role="dialog"]`, OneTrust, Cookiebot, Bootstrap modal selectors
- **Score Ring**: SVG `stroke-dashoffset` animation driven by JS counter
- **Client**: Pure Vanilla JS — zero build step, zero dependencies

---

## 📅 180 Days of Building

This project is part of a larger developer journey: shipping one useful AI tool every day for 180 days.

This release is part of the **Google I/O 2026 Sprint** (`IO Sprint #5`), powered by **Gemini 3.5 Flash**.

Follow along for daily releases and tech deep dives:
- **Twitter / X**: [@happy_ships](https://x.com/happy_ships)
- **Day**: `12 / 180`

---

*Licensed under the [MIT License](LICENSE).*
