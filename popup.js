// ============================================
// FINE PRINT DECODER — popup.js
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Element refs ----
  const mainContent   = document.getElementById('main-content');
  const loading       = document.getElementById('loading');
  const result        = document.getElementById('result');
  const error         = document.getElementById('error');
  const errorMessage  = document.getElementById('error-message');
  const actionBtn     = document.getElementById('action-btn');
  const retryBtn      = document.getElementById('retry-btn');
  const rerunBtn      = document.getElementById('rerun-btn');
  const resetBtn      = document.getElementById('reset-btn');
  const copyBtn       = document.getElementById('copy-btn');
  const settingsBtn   = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const geminiKeyInput      = document.getElementById('gemini-key-input');
  const openrouterKeyInput  = document.getElementById('openrouter-key-input');
  const saveKeysBtn   = document.getElementById('save-keys-btn');
  const clearKeysBtn  = document.getElementById('clear-keys-btn');
  const modelSelect   = document.getElementById('model-select');

  // ---- UI State Machine ----
  function showState(state) {
    mainContent.classList.toggle('hidden', state !== 'idle');
    loading.classList.toggle('hidden', state !== 'loading');
    result.classList.toggle('hidden', state !== 'result');
    error.classList.toggle('hidden', state !== 'error');
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    showState('error');
  }

  // ---- Onboarding ----
  const onboarding              = document.getElementById('onboarding');
  const onboardGeminiInput      = document.getElementById('onboard-gemini-input');
  const onboardOpenrouterInput  = document.getElementById('onboard-openrouter-input');
  const onboardSaveBtn          = document.getElementById('onboard-save-btn');

  function showOnboarding() {
    onboarding.classList.remove('hidden');
    ['main-content', 'loading', 'result', 'error'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
  }

  function hideOnboarding() { onboarding.classList.add('hidden'); }

  document.getElementById('onboard-toggle-gemini').addEventListener('click', () => {
    onboardGeminiInput.type = onboardGeminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('onboard-toggle-openrouter').addEventListener('click', () => {
    onboardOpenrouterInput.type = onboardOpenrouterInput.type === 'password' ? 'text' : 'password';
  });

  onboardSaveBtn.addEventListener('click', () => {
    const gk = onboardGeminiInput.value.trim();
    const ok = onboardOpenrouterInput.value.trim();
    if (!gk && !ok) {
      onboardSaveBtn.textContent = '⚠ Enter at least one key';
      setTimeout(() => { onboardSaveBtn.textContent = 'Start Decoding →'; }, 2000);
      return;
    }
    const updates = {};
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    chrome.storage.local.set(updates, () => {
      hideOnboarding();
      clearSessionCache(() => initApp());
    });
  });

  // ---- Session Cache helpers ----
  function clearSessionCache(cb) {
    chrome.storage.session.remove(['cached_analysis', 'cached_at'], cb);
  }

  function initApp() {
    chrome.storage.session.get(['cached_analysis', 'cached_at'], (data) => {
      if (data.cached_analysis && data.cached_at && Date.now() - data.cached_at < 10 * 60 * 1000) {
        try {
          const analysis = JSON.parse(data.cached_analysis);
          renderResult(analysis);
          return;
        } catch (e) { /* stale/corrupt cache */ }
      }
      showState('idle');
    });
  }

  chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (keys) => {
    if (!keys.gemini_api_key && !keys.openrouter_api_key) showOnboarding();
    else initApp();
  });

  // ---- Score Counter Animation ----
  function animateScore(from, to, durationMs) {
    const el = document.getElementById('score-num');
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(from + (to - from) * ease);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Render Result ----
  function renderResult(analysis) {
    const { score, verdict, verdict_reason, red_flags, hidden_clauses, plain_summary } = analysis;

    // Verdict color classes + ring stroke
    const colorMap = {
      Danger:  { cls: 'danger',  stroke: '#ef4444' },
      Caution: { cls: 'caution', stroke: '#f59e0b' },
      Safe:    { cls: 'safe',    stroke: '#22c55e' },
    };
    const colors = colorMap[verdict] || colorMap['Caution'];

    // Verdict tag
    const tag = document.getElementById('verdict-tag');
    tag.textContent = verdict;
    tag.className = `verdict-tag ${colors.cls}`;

    // Verdict reason
    document.getElementById('verdict-reason').textContent = verdict_reason || '—';

    // Score ring
    const arc = document.getElementById('ring-fill');
    const circ = 2 * Math.PI * 28; // r=28
    arc.style.strokeDasharray = circ;
    arc.style.strokeDashoffset = circ;
    arc.style.stroke = colors.stroke;
    requestAnimationFrame(() => {
      setTimeout(() => {
        arc.style.strokeDashoffset = circ * (1 - Math.max(0, Math.min(score, 100)) / 100);
      }, 60);
    });

    // Score counter
    animateScore(0, score, 1100);

    // Cards
    const container = document.getElementById('cards-wrap');
    container.innerHTML = '';

    const sections = [
      {
        key: 'red_flags',
        title: '🚩 Red Flags',
        items: red_flags,
        color: '#ef4444',
        delay: 0,
      },
      {
        key: 'hidden_clauses',
        title: '⚠ Hidden Clauses',
        items: hidden_clauses,
        color: '#f59e0b',
        delay: 90,
      },
      {
        key: 'plain_summary',
        title: '📋 Plain Summary',
        items: plain_summary,
        color: '#14b8a6',
        delay: 180,
      },
    ];

    sections.forEach(({ title, items, color, delay }) => {
      if (!items || items.length === 0) return;
      const card = document.createElement('div');
      card.className = 'result-card';
      card.style.borderLeftColor = color;
      card.style.animationDelay = `${delay}ms`;

      const cardTitle = document.createElement('div');
      cardTitle.className = 'card-title';
      cardTitle.style.color = color;
      cardTitle.textContent = title;

      const list = document.createElement('ul');
      list.className = 'card-items';
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });

      card.appendChild(cardTitle);
      card.appendChild(list);
      container.appendChild(card);
    });

    showState('result');
    result.classList.add('fade-in');
  }

  // ---- Action Logic ----
  async function runAction() {
    showState('loading');

    try {
      // Extract page text via scripting API (no content script needed)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found.');

      let pageData;
      try {
        const injected = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const JUNK = 'script, style, nav, header, footer, aside, iframe, [role="navigation"], .cookie-banner';

            // Helper: is this element actually visible on screen?
            function isVisible(el) {
              if (!el) return false;
              const r = el.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) return false;
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            }

            // 1. Look for an open modal / dialog containing T&C text
            const MODAL_SELECTORS = [
              'dialog[open]',
              '[role="dialog"]',
              '[aria-modal="true"]',
              '[role="alertdialog"]',
              // Common class patterns used by Cookiebot, OneTrust, TrustArc, generic modals
              '.modal-body',
              '.modal-content',
              '.tos-modal',
              '.terms-modal',
              '.privacy-modal',
              '[class*="modal"][class*="content"]',
              '[class*="dialog"][class*="content"]',
              '[class*="terms"][class*="body"]',
              '[class*="privacy"][class*="body"]',
              // Shadow DOM portals that render in body
              '#onetrust-policy-text',
              '#cookieConsent',
              '.cookie-policy-content',
            ];

            let source = null;
            let sourceLabel = 'page';

            for (const sel of MODAL_SELECTORS) {
              try {
                const el = document.querySelector(sel);
                if (el && isVisible(el)) {
                  // Make sure it has meaningful text (not just a button bar)
                  const preview = el.innerText?.trim() || '';
                  if (preview.length > 200) {
                    source = el;
                    sourceLabel = 'modal';
                    break;
                  }
                }
              } catch (_) { /* bad selector, skip */ }
            }

            // 2. Fall back to main page content
            if (!source) {
              source = document.querySelector('main') ||
                       document.querySelector('article') ||
                       document.querySelector('[role="main"]') ||
                       document.body;
            }

            const clone = source.cloneNode(true);
            clone.querySelectorAll(JUNK).forEach(el => el.remove());

            const raw = clone.innerText || '';
            return {
              title: document.title,
              url: window.location.href,
              source: sourceLabel,
              text: raw.replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000),
            };
          },
        });
        pageData = injected?.[0]?.result;
      } catch (e) {
        throw new Error('Cannot read this page. Try refreshing or navigating to the T&C page first.');
      }

      if (!pageData?.text || pageData.text.length < 100) {
        throw new Error(
          'Page content is too short to analyze. ' +
          'If the Terms are in a popup, make sure it\'s fully open before clicking Decode.'
        );
      }

      // Let user know what was detected + how much text was found
      const loadingSub = document.getElementById('loading-sub');
      if (loadingSub) {
        const charCount = pageData.text.length.toLocaleString();
        loadingSub.textContent = pageData.source === 'modal'
          ? `Reading from open popup / dialog · ${charCount} chars`
          : `Gemini 3.5 Flash scanning ${charCount} chars`;
      }

      const prompt = `Analyze the following Terms & Conditions or Privacy Policy text.

Return ONLY a valid JSON object. No markdown fences. No explanation. No extra text.

Required format:
{
  "score": <integer 0–100, where 100 = fully safe, 0 = extremely harmful>,
  "verdict": <"Safe" | "Caution" | "Danger">,
  "verdict_reason": <one sentence explaining the score>,
  "red_flags": [<2–4 strings: clearly harmful or deceptive clauses>],
  "hidden_clauses": [<2–3 strings: buried terms most users would miss>],
  "plain_summary": [<3–4 strings: key points users need to know, in plain English>]
}

Scoring guide: 66–100 = Safe, 31–65 = Caution, 0–30 = Danger

Page: ${pageData.title}
URL: ${pageData.url}
Content source: ${pageData.source === 'modal' ? 'in-page popup/dialog' : 'main page'}

DOCUMENT TEXT:
${pageData.text}`;

      const savedModel = await new Promise(r =>
        chrome.storage.local.get(['gemini_model'], d => r(d.gemini_model || 'gemini-3.5-flash'))
      );

      chrome.runtime.sendMessage(
        {
          action: 'callGeminiBackground',
          prompt,
          options: {
            model: savedModel,
            systemInstruction: 'You are a legal document analyst. Return ONLY valid JSON, no markdown, no fences, no prose.',
            temperature: 0.2,
            maxTokens: 1024,
          },
        },
        (response) => {
          if (!response?.success) {
            showError(response?.error || 'Analysis failed. Check your API key in ⚙ Settings.');
            return;
          }
          try {
            let raw = response.data.trim();
            // Strip any markdown fences (various formats Gemini may emit)
            raw = raw.replace(/^```[\w]*\s*/i, '').replace(/\s*```$/i, '').trim();
            // If model added prose before/after JSON, extract the first { } block
            if (!raw.startsWith('{')) {
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) raw = match[0];
            }
            const analysis = JSON.parse(raw);
            renderResult(analysis);
            chrome.storage.session.set({
              cached_analysis: JSON.stringify(analysis),
              cached_at: Date.now(),
            });
          } catch (e) {
            showError('Could not parse AI response. Try again.');
          }
        }
      );

    } catch (err) {
      showError(err.message || 'Something went wrong. Try again.');
    }
  }

  // ---- Copy Result ----
  copyBtn.addEventListener('click', () => {
    chrome.storage.session.get(['cached_analysis'], (data) => {
      if (!data.cached_analysis) return;
      try {
        const a = JSON.parse(data.cached_analysis);
        const lines = [
          `Fine Print Decoder — ${a.verdict} (${a.score}/100)`,
          `${a.verdict_reason}`,
          '',
          '🚩 Red Flags:',
          ...(a.red_flags || []).map(x => `  → ${x}`),
          '',
          '⚠ Hidden Clauses:',
          ...(a.hidden_clauses || []).map(x => `  → ${x}`),
          '',
          '📋 Plain Summary:',
          ...(a.plain_summary || []).map(x => `  → ${x}`),
        ];
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
          copyBtn.textContent = '✅ Copied';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1800);
        });
      } catch (e) { /* ignore */ }
    });
  });

  // ---- Settings Panel ----
  function openSettings() {
    settingsPanel.classList.remove('hidden');
    settingsPanel.classList.add('fade-in');
    chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key', 'gemini_model'], (data) => {
      geminiKeyInput.value = data.gemini_api_key || '';
      openrouterKeyInput.value = data.openrouter_api_key || '';
      modelSelect.value = data.gemini_model || 'gemini-3.5-flash';
    });
  }

  function closeSettings() {
    settingsPanel.classList.add('hidden');
    settingsPanel.classList.remove('fade-in');
  }

  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);

  document.getElementById('toggle-gemini-key').addEventListener('click', () => {
    geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('toggle-openrouter-key').addEventListener('click', () => {
    openrouterKeyInput.type = openrouterKeyInput.type === 'password' ? 'text' : 'password';
  });

  saveKeysBtn.addEventListener('click', () => {
    const updates = {};
    const gk = geminiKeyInput.value.trim();
    const ok = openrouterKeyInput.value.trim();
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    if (Object.keys(updates).length === 0) return;
    updates.gemini_model = modelSelect.value || 'gemini-3.5-flash';
    chrome.storage.local.set(updates, () => {
      saveKeysBtn.textContent = '✅ Saved';
      setTimeout(() => { saveKeysBtn.textContent = 'Save'; }, 1500);
    });
  });

  clearKeysBtn.addEventListener('click', async () => {
    await resetApiKeys();
    clearSessionCache();
    geminiKeyInput.value = '';
    openrouterKeyInput.value = '';
    clearKeysBtn.textContent = '✅ Cleared';
    setTimeout(() => { clearKeysBtn.textContent = 'Clear All'; }, 1500);
  });

  // ---- Event Listeners ----
  actionBtn.addEventListener('click', runAction);
  retryBtn.addEventListener('click', runAction);
  rerunBtn.addEventListener('click', runAction);
  resetBtn.addEventListener('click', () => {
    clearSessionCache(() => showState('idle'));
  });
});
