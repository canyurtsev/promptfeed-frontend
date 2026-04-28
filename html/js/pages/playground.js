/* ================================================================
   playground.js — Prompt Testing Lab Controller
   Strict implementation: Real API calls, No mocks, Full CSP.
   ================================================================ */

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let parsedVars = [];

/* ── Utilities ── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'pf-toast'; 
  t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--pf-surface);border:1px solid var(--pf-border);padding:10px 16px;border-radius:6px;font-size:13px;z-index:9999;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ── Auth ── */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = '<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a><a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>';
    return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success) {
      currentUser = d.data;
      area.innerHTML = '';
      const avatar = document.createElement('div');
      avatar.className = 'pf-avatar';
      avatar.id = 'user-avatar';
      avatar.title = 'Profile';
      if (currentUser.avatarUrl) {
          avatar.style.backgroundImage = 'url(' + esc(currentUser.avatarUrl) + ')';
      }
      area.appendChild(avatar);
      avatar.onclick = () => { window.location.href = 'signin.html'; };
    } else {
      area.innerHTML = '<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>';
    }
  } catch {
    area.innerHTML = '<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>';
  }
}

/* ── Gate ── */
function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }

/* ── Variable Detection ── */
const promptInput = document.getElementById('prompt-input');
const varsContainer = document.getElementById('variables-container');
const varsList = document.getElementById('variables-list');

if (promptInput) {
    promptInput.addEventListener('input', () => {
      const text = promptInput.value;
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      const foundVars = new Set();
      while ((match = regex.exec(text)) !== null) {
        foundVars.add(match[1].trim());
      }
      
      const currentVars = Array.from(foundVars);
      
      if (currentVars.length === 0) {
        varsContainer.style.display = 'none';
        varsList.innerHTML = '';
        parsedVars = [];
        return;
      }
      
      varsContainer.style.display = 'block';
      
      const existingValues = {};
      document.querySelectorAll('.pf-var-input').forEach(input => {
        existingValues[input.dataset.var] = input.value;
      });
      
      varsList.innerHTML = '';
      currentVars.forEach(v => {
          const row = document.createElement('div');
          row.className = 'pf-var-row';
          
          const label = document.createElement('label');
          label.className = 'pf-var-label';
          label.textContent = '{{' + v + '}}';
          
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'pf-var-input';
          input.dataset.var = v;
          input.placeholder = 'Value for ' + v;
          if (existingValues[v]) input.value = existingValues[v];
          
          row.appendChild(label);
          row.appendChild(input);
          varsList.appendChild(row);
      });
      
      parsedVars = currentVars;
    });
}

/* ── Initial Prompt Load ── */
async function loadPromptFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('promptId') || params.get('id');
  if (!pid) return;

  try {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const r = await fetch(API + '/api/prompts/' + pid, { headers });
    const d = await r.json();
    
    if (d.success && d.data) {
      const p = d.data;
      
      if (p.isPremium && !p.content) {
        showError('lock', 'Premium Prompt', 'You need a subscription or ownership to test this prompt.');
        return;
      }
      
      document.getElementById('prompt-context').style.display = 'block';
      document.getElementById('prompt-title').textContent = p.title;
      
      promptInput.value = p.content || '';
      promptInput.dispatchEvent(new Event('input')); 
    }
  } catch (err) {
    console.error("Failed to load prompt:", err);
  }
}

function showError(iconName, titleText, msgText, reqId = null) {
    const outputArea = document.getElementById('output-area');
    outputArea.innerHTML = '';
    
    const errBox = document.createElement('div');
    errBox.className = 'pf-error-box';
    
    const title = document.createElement('div');
    title.className = 'pf-error-title';
    title.innerHTML = '<span class="material-symbols-outlined">' + esc(iconName) + '</span> ' + esc(titleText);
    
    const msg = document.createElement('div');
    msg.className = 'pf-error-msg';
    msg.textContent = msgText;
    
    errBox.appendChild(title);
    errBox.appendChild(msg);
    
    if (reqId && reqId !== 'N/A') {
        const reqDiv = document.createElement('div');
        reqDiv.className = 'pf-error-reqid';
        reqDiv.textContent = 'Request ID: ' + reqId;
        errBox.appendChild(reqDiv);
    }
    
    outputArea.appendChild(errBox);
}

/* ── Execution Logic ── */
const runBtn = document.getElementById('run-btn');

if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const outputArea = document.getElementById('output-area');
      if (!token || !currentUser) {
        document.getElementById('pf-gate').classList.add('open');
        return;
      }

      const basePrompt = promptInput.value.trim();
      if (!basePrompt) {
        toast("Prompt cannot be empty");
        return;
      }

      let finalInput = '';
      if (parsedVars.length > 0) {
        const varData = [];
        document.querySelectorAll('.pf-var-input').forEach(input => {
          varData.push(input.dataset.var + ': ' + input.value);
        });
        finalInput = varData.join('\n');
      }

      const model = document.getElementById('model-select').value;

      runBtn.innerHTML = '<div class="pf-spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff;"></div> Running...';
      runBtn.disabled = true;
      outputArea.innerHTML = '<div class="pf-empty-output"><div class="pf-spinner" style="width:30px;height:30px;"></div><span>Executing prompt...</span></div>';
      
      document.getElementById('m-status').textContent = 'Running';
      document.getElementById('m-model').textContent = model;
      document.getElementById('m-latency').textContent = '—';
      document.getElementById('m-tokens').textContent = '—';
      document.getElementById('m-cost').textContent = '—';
      document.getElementById('m-reqid').textContent = '—';
      document.getElementById('rating-area').style.display = 'none';
      document.getElementById('rating-msg').style.display = 'none';

      try {
        const res = await fetch(API + '/api/playground/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            prompt: basePrompt,
            userInput: finalInput,
            model: model
          })
        });

        const data = await res.json();

        if (!data.success) {
          throw data;
        }

        const result = data.data;

        if (result.error) {
          showError('warning', 'API Error', result.message || result.error);
          document.getElementById('m-status').textContent = 'Failed';
          document.getElementById('m-status').style.color = 'var(--pf-danger)';
        } else {
          let content = result.response;
          if (result.bestMatch) content = result.bestMatch.response;
          
          outputArea.textContent = content; // Safely set output via textContent
          
          document.getElementById('m-status').textContent = result.source ? 'Success (' + result.source + ')' : 'Success';
          document.getElementById('m-status').style.color = 'var(--pf-success)';
          document.getElementById('m-latency').textContent = result.latencyMs ? result.latencyMs + 'ms' : 'N/A';
          document.getElementById('m-tokens').textContent = result.tokens ? result.tokens.toString() : 'Not available';
          document.getElementById('m-cost').textContent = result.costSaved ? 'Saved $' + result.costSaved : 'N/A';
          
          document.getElementById('rating-area').style.display = 'flex';
          document.querySelectorAll('.pf-star').forEach(s => s.classList.remove('active'));
        }

      } catch (err) {
        const errCode = err.error?.code || 'ERROR';
        const errMsg = err.error?.message || err.message || 'An unknown error occurred.';
        const reqId = err.error?.requestId || 'N/A';
        
        showError('error', errCode, errMsg, reqId);
        
        document.getElementById('m-status').textContent = 'Error';
        document.getElementById('m-status').style.color = 'var(--pf-danger)';
        if (reqId !== 'N/A') {
          document.getElementById('m-reqid').textContent = reqId;
        }
      } finally {
        runBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">play_arrow</span> Run';
        runBtn.disabled = false;
      }
    });
}

/* ── Rating Stubs ── */
document.querySelectorAll('.pf-star').forEach(star => {
  star.addEventListener('click', (e) => {
    const val = parseInt(e.target.dataset.val);
    document.querySelectorAll('.pf-star').forEach(s => {
      if (parseInt(s.dataset.val) <= val) s.classList.add('active');
      else s.classList.remove('active');
    });
    document.getElementById('rating-msg').style.display = 'block';
  });
});

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
    const gateCancelBtn = document.getElementById('gate-cancel-btn');
    if (gateCancelBtn) gateCancelBtn.addEventListener('click', closeGate);
    
    const gateSigninBtn = document.getElementById('gate-signin-btn');
    if (gateSigninBtn) gateSigninBtn.addEventListener('click', gotoSignin);
    
    await initAuth();
    await loadPromptFromUrl();
});
