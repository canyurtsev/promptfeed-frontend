/* ================================================================
   skill-editor.html — Controller
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let isEditMode = false;

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function showError(msg, reqId) {
  const box = document.getElementById('error-box');
  const spanMsg = document.getElementById('error-msg');
  const spanReq = document.getElementById('error-reqid');
  box.style.display = 'block';
  spanMsg.textContent = msg;
  if (reqId) {
    spanReq.textContent = 'ReqID: ' + reqId;
  } else {
    spanReq.textContent = '';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
  document.getElementById('error-box').style.display = 'none';
}

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if (!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function redirectToSignin() {
  window.location.href = 'signin.html?returnUrl=skill-editor.html';
}

/* —— Auth —— */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    redirectToSignin();
    return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span id="wallet-bal">${esc(String(currentUser.wallet?.balance ?? currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')' : ''}"
          data-action="goto-profile">${currentUser.avatarUrl ? '' : esc(String(currentUser.username || currentUser.fullName || currentUser.email || 'A')[0].toUpperCase())}</div>`;
    } else {
      redirectToSignin();
    }
  } catch {
    redirectToSignin();
  }
}

/* —— UI Logic —— */
function switchTab(id) {
  document.querySelectorAll('.se-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.se-editor-area').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('area-' + id).classList.add('active');
  updatePreview();
}

function togglePreview() {
  const show = document.getElementById('toggle-preview').checked;
  document.querySelectorAll('.pf-textarea').forEach(el => { el.style.display = show ? 'none' : 'block'; });
  document.querySelectorAll('.se-preview').forEach(el => { el.classList.toggle('active', show); });
  if (show) updatePreview();
}

function updatePreview() {
  const show = document.getElementById('toggle-preview').checked;
  if (!show) return;
  ['skill', 'example', 'checklist'].forEach(id => {
    const val = document.getElementById('f-' + id).value;
    document.getElementById('prev-' + id).textContent = val || 'No content yet.';
  });
}

function updateCheckboxes() {
  const ex = document.getElementById('f-example').value.trim() !== '';
  const ch = document.getElementById('f-checklist').value.trim() !== '';
  document.getElementById('c-example').checked = ex;
  document.getElementById('c-checklist').checked = ch;
}

function togglePrice() {
  const val = document.querySelector('input[name="f-pricing"]:checked').value;
  document.getElementById('price-group').style.display = val === 'premium' ? 'flex' : 'none';
  if (val === 'free') document.getElementById('f-price').value = '';
}

/* —— Load Data —— */
async function loadEditorData() {
  if (editId) {
    isEditMode = true;
    document.getElementById('page-title').textContent = 'Edit Skill Package';
    document.getElementById('btn-publish').textContent = 'Save Changes';

    try {
      const headers = { Authorization: 'Bearer ' + token };
      let res = await fetch(API + '/api/skill-documents/' + editId, { headers });
      if (!res.ok && res.status === 404) {
        res = await fetch(API + '/api/skills/' + editId, { headers });
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error?.message || 'Failed to load skill');

      const s = data.data;
      document.getElementById('f-title').value = s.name || s.title || '';
      document.getElementById('f-desc').value = s.description || '';
      document.getElementById('f-skill').value = s.content || s.skillMd || '';
      document.getElementById('f-example').value = s.examples || s.examplesMd || '';
      document.getElementById('f-checklist').value = s.notes || s.checklistMd || '';

      document.getElementById('f-category').value = s.category || '';
      document.getElementById('f-tags').value = (s.tags || []).join(', ');
      document.getElementById('f-version').value = s.version || 'v1.0.0';
      document.getElementById('f-compat').value = s.compatibility || 'Universal';

      if (s.price && s.price !== '0' && s.price !== '0.00') {
        document.querySelector('input[name="f-pricing"][value="premium"]').checked = true;
        document.getElementById('f-price').value = s.price;
        togglePrice();
      }

      updateCheckboxes();
    } catch (err) {
      showError(err.message);
    }
  }

  document.getElementById('init-loading').style.display = 'none';
  document.getElementById('page-content').style.display = 'grid';
}

/* —— Publish —— */
async function handlePublish() {
  hideError();
  const btn = document.getElementById('btn-publish');
  const title = document.getElementById('f-title').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const content = document.getElementById('f-skill').value.trim();
  const category = document.getElementById('f-category').value.trim();
  const isPremium = document.querySelector('input[name="f-pricing"]:checked').value === 'premium';
  const priceInput = document.getElementById('f-price');
  const raw = priceInput.value.trim();
  let price = '0.00';

  if (!title || !desc || !content || !category) {
    showError('Please fill in all required fields (Title, Description, skill.md, Category).');
    return;
  }
  if (isPremium) {
    if (!raw) {
      showError('Price is required for premium skills.');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      showError('Invalid price format');
      return;
    }
    price = raw;
  }

  const tags = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);

  const payload = {
    title,
    name: title,
    description: desc,
    content,
    skillMd: content,
    examples: document.getElementById('f-example').value.trim(),
    notes: document.getElementById('f-checklist').value.trim(),
    category,
    tags,
    version: document.getElementById('f-version').value.trim(),
    compatibility: document.getElementById('f-compat').value.trim(),
    isPublic: document.querySelector('input[name="f-visibility"]:checked').value === 'public',
    price: price
  };

  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = isEditMode ? 'Saving...' : 'Publishing...';

  try {
    const endpoint = isEditMode ? `/api/skill-documents/${editId}` : '/api/skill-documents';
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(API + endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    });

    if (res.status === 404) throw new Error('Skill publishing API is Coming Soon. (Endpoint not found)');

    const data = await res.json();

    if (data.success) {
      toast('✅ ' + (isEditMode ? 'Skill updated!' : 'Skill published!'));
      setTimeout(() => {
        window.location.href = 'skill-detail.html?id=' + encodeURIComponent(data.data?.id || editId);
      }, 1000);
    } else {
      showError(data.message || data.error?.message || 'Failed to publish.', data.error?.requestId);
      btn.disabled = false;
      btn.textContent = origText;
    }
  } catch (err) {
    if (err.message.includes('Coming Soon')) {
      showError(err.message);
    } else {
      showError('Network error. Ensure backend is running.');
    }
    btn.disabled = false;
    btn.textContent = origText;
  }
}

/* —— Delegated Events + Init —— */
document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === 'switch-tab') {
    switchTab(actionEl.dataset.tab);
    return;
  }
  if (action === 'publish-skill') {
    handlePublish();
    return;
  }
  if (action === 'cancel-editor') {
    window.location.href = 'skill-library.html';
    return;
  }
  if (action === 'goto-profile') {
    window.location.href = 'signin.html';
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'toggle-preview') {
    togglePreview();
    return;
  }
  if (e.target.matches('input[name="f-pricing"]')) {
    togglePrice();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'f-example' || e.target.id === 'f-checklist') {
    updateCheckboxes();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  if (token) await loadEditorData();
});
