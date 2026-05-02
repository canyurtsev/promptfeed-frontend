/* ================================================================
   signin.html — Controller
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
let mode = 'login';
const urlParams = new URLSearchParams(window.location.search);
const returnUrl = urlParams.get('returnUrl');
const token = localStorage.getItem('accessToken');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function normalizeReturnUrl(url) {
  if (!url || typeof url !== 'string') return '/index.html';
  if (/^https?:\/\//i.test(url)) return '/index.html';
  if (!url.startsWith('/')) return '/' + url;
  return url;
}

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
}

function hideError() {
  document.getElementById('error-box').style.display = 'none';
}

function setMode(newMode) {
  mode = newMode;
  hideError();

  if (mode === 'login') {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('group-username').style.display = 'none';
    document.getElementById('submit-btn').textContent = 'Sign in';
    document.querySelector('.auth-title').textContent = 'Sign in to PromptFeed';
    document.getElementById('password').autocomplete = 'current-password';
    document.getElementById('forgot-link').style.display = 'block';
  } else {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('group-username').style.display = 'flex';
    document.getElementById('submit-btn').textContent = 'Create Account';
    document.querySelector('.auth-title').textContent = 'Join PromptFeed';
    document.getElementById('password').autocomplete = 'new-password';
    document.getElementById('forgot-link').style.display = 'none';
  }
}

async function handleAuth(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value.trim();

  const btn = document.getElementById('submit-btn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Please wait...';

  const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
  const payload = mode === 'login' ? { email, password } : { email, password, username };

  try {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }

      const finalUrl = normalizeReturnUrl(returnUrl || 'community.html');
      window.location.href = finalUrl;
    } else {
      showError(data.message || data.error?.message || 'Authentication failed.', data.error?.requestId);
      btn.disabled = false;
      btn.textContent = origText;
    }
  } catch (err) {
    showError('Network error. Ensure backend is running.', null);
    btn.disabled = false;
    btn.textContent = origText;
  }
}

function handleOAuth(provider) {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const redirectTo = normalizeReturnUrl(returnUrl || 'community.html');
  const targetUrl = `${API}/api/auth/${provider}?returnUrl=${encodeURIComponent(redirectTo)}`;
  window.location.href = targetUrl;
}

async function handleOAuthCallback() {
  const oauthCode = urlParams.get('oauthCode');
  const error = urlParams.get('error');

  if (error) {
    showError(error, null);
    clearOAuthParams();
    return;
  }

  if (!oauthCode) return;

  const btn = document.getElementById('submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Completing sign in...';
  }

  try {
    const res = await fetch(API + '/api/auth/oauth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: oauthCode })
    });

    const data = await res.json();

    if (data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }

      clearOAuthParams();

      const finalUrl = normalizeReturnUrl(returnUrl || 'community.html');
      window.location.href = finalUrl;
    } else {
      showError(data.message || data.error?.message || 'OAuth exchange failed.', data.error?.requestId);
      clearOAuthParams();
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    }
  } catch (err) {
    showError('Network error. Ensure backend is running.', null);
    clearOAuthParams();
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }
}

function clearOAuthParams() {
  const url = new URL(window.location);
  url.searchParams.delete('oauthCode');
  url.searchParams.delete('error');
  url.searchParams.delete('returnUrl');
  window.history.replaceState({}, '', url);
}

function checkExistingSession() {
  if (!token) return;

  fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        const finalUrl = normalizeReturnUrl(returnUrl || 'community.html');
        window.location.href = finalUrl;
      }
    })
    .catch(() => {});
}

document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  if (action === 'set-mode') {
    setMode(actionEl.dataset.mode || 'login');
    return;
  }
  if (action === 'oauth') {
    handleOAuth(actionEl.dataset.provider || '');
  }
});

document.addEventListener('submit', e => {
  if (e.target && e.target.id === 'auth-form') {
    handleAuth(e);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (urlParams.get('mode') === 'register') setMode('register');
  handleOAuthCallback();
  checkExistingSession();
});
