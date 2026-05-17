// js/pages/playground.js
'use strict';

const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://promptfeed-backend.onrender.com";
const API = API_BASE_URL;

document.addEventListener('DOMContentLoaded', async () => {
  function getPromptId() {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    if (!id && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      id = hashParams.get('id');
    }
    if (id && !/^[0-9]+$/.test(id) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      id = null;
    }
    return id;
  }
  const promptId = getPromptId();

  const promptInfo = document.getElementById('prompt-info');
  const promptMedia = document.getElementById('prompt-media');
  const promptTitle = document.getElementById('prompt-title');
  const promptBadge = document.getElementById('prompt-badge');
  const promptMeta = document.getElementById('prompt-meta');
  
  const promptError = document.getElementById('prompt-error');
  const errorTitle = document.getElementById('prompt-error-title');
  const errorDesc = document.getElementById('prompt-error-desc');

  const promptInput = document.getElementById('prompt-input');
  const promptOutput = document.getElementById('prompt-output');
  const btnRun = document.getElementById('btn-run');
  const executionsList = document.getElementById('executions-list');

  const token = localStorage.getItem('accessToken');
  let loadedPrompt = null;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Auth UI setup
  const navAuthArea = document.getElementById('nav-auth-area');
  if (navAuthArea) {
    if (token) {
      try {
        const meRes = await fetch(API + '/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          const username = meData.data.username || meData.data.name || 'Account';
          const avatarUrl = meData.data.avatarUrl || '';
          
          let avatarHtml = '';
          if (avatarUrl) {
            avatarHtml = `<img class="pf-avatar" src="${esc(avatarUrl)}" alt="Avatar" />`;
          } else {
            avatarHtml = `<div class="pf-avatar">${esc(username.slice(0, 1).toUpperCase())}</div>`;
          }

          navAuthArea.innerHTML = `
            <div class="pf-user-chip" title="Profile">
              ${avatarHtml}
              <span class="pf-user-chip__body">
                <span class="pf-user-chip__name">${esc(username)}</span>
              </span>
            </div>
            <button id="nav-btn-logout" class="pf-btn pf-btn--ghost pf-btn--sm">Logout</button>
          `;
          document.getElementById('nav-btn-logout').addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = 'signin.html';
          });
        }
      } catch (e) {
        console.error('Error fetching user', e);
      }
    } else {
      navAuthArea.innerHTML = `
        <a href="signin.html?returnUrl=/playground.html?id=${encodeURIComponent(promptId || '')}" class="pf-btn pf-btn--ghost">Sign in</a>
        <a href="signin.html?mode=register&returnUrl=/playground.html?id=${encodeURIComponent(promptId || '')}" class="pf-btn pf-btn--primary">Sign up</a>
      `;
    }
  }

  function showError(title, desc) {
    promptInfo.classList.add('pg-hidden');
    promptError.classList.remove('pg-hidden');
    errorTitle.textContent = title;
    errorDesc.textContent = desc;
    btnRun.disabled = true;
  }

  if (!promptId) {
    showError('No Prompt ID', 'A prompt ID must be specified in the URL.');
    return;
  }

  async function fetchPrompt() {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(API + `/api/prompts/${promptId}`, { headers });
      const data = await res.json();

      if (data.success && data.data) {
        loadedPrompt = data.data;
        promptInfo.classList.remove('pg-hidden');
        
        promptTitle.textContent = loadedPrompt.title || 'Untitled Prompt';
        promptInput.value = loadedPrompt.content || '';
        
        function isValidImageUrl(url) {
          if (!url) return false;
          try {
            const p = new URL(url);
            const path = p.pathname.toLowerCase();
            return /\.(png|jpe?g|webp|gif|avif|svg)$/.test(path) ||
                   p.hostname.includes('unsplash.com') ||
                   p.hostname.includes('cloudinary.com') ||
                   p.hostname.includes('imgur.com');
          } catch { return false; }
        }

        // Media rendering
        let mediaHtml = '';
        const validImg = isValidImageUrl(loadedPrompt.imageUrl);
        if (validImg) {
          mediaHtml += `<img class="pg-prompt-thumb" src="${esc(loadedPrompt.imageUrl)}" alt="Prompt thumbnail"/>`;
        }
        if (loadedPrompt.resourceUrl && !validImg) {
          mediaHtml += `<div class="mk-card__resource-only"><a class="pg-resource-chip" href="${esc(loadedPrompt.resourceUrl)}" target="_blank" rel="noopener noreferrer">
            <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
            ${esc(loadedPrompt.resourceUrl)}
          </a></div>`;
        }
        promptMedia.innerHTML = mediaHtml;

        // Badge
        const numericPrice = parseFloat(loadedPrompt.price);
        const isPremium = numericPrice > 0;
        if (isPremium) {
          promptBadge.innerHTML = `<span class="mk-badge mk-badge--premium">Premium</span>`;
        } else {
          promptBadge.innerHTML = `<span class="mk-badge mk-badge--free">Free</span>`;
        }

        // Meta (Author & Tags)
        const author = loadedPrompt.user?.username || 'unknown';
        const tags = Array.isArray(loadedPrompt.tags) ? loadedPrompt.tags : (String(loadedPrompt.tags || '').split(',').map(t=>t.trim()).filter(Boolean));
        const tagsHtml = tags.slice(0,3).map(t => `<span class="pf-tag">${esc(t)}</span>`).join('');
        
        promptMeta.innerHTML = `
          <span class="pg-meta-author">by <strong>${esc(author)}</strong></span>
          ${tagsHtml ? `<span class="pg-meta-dot">·</span>${tagsHtml}` : ''}
        `;

        btnRun.disabled = false;
      } else {
        showError('Access Denied', 'Prompt not found or you do not have permission to access it.');
      }
    } catch (error) {
      console.error('Error fetching prompt', error);
      showError('Connection Error', 'Failed to load prompt from server.');
    }
  }

  async function fetchExecutions() {
    if (!token) {
      executionsList.innerHTML = '<div class="pg-history-msg">Sign in to view execution history.</div>';
      return;
    }

    try {
      const res = await fetch(API + '/api/users/me/executions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        executionsList.innerHTML = data.data.map(exec => `
          <div class="pg-history-item" data-id="${esc(exec.id)}">
            <div class="pg-history-item__title">${esc(exec.prompt?.title || 'Unknown Prompt')}</div>
            <div class="pg-history-item__meta">${new Date(exec.createdAt).toLocaleString()}</div>
          </div>
        `).join('');
      } else {
        executionsList.innerHTML = '<div class="pg-history-msg">No recent executions.</div>';
      }
    } catch (error) {
      console.error('Error fetching executions', error);
      executionsList.innerHTML = '<div class="pg-history-msg pg-color-danger">Failed to load history.</div>';
    }
  }

  btnRun.addEventListener('click', async () => {
    if (!token) {
      // Create quick toast or alert equivalent (reusing pf system if available, else alert)
      alert('Please sign in to run prompts.');
      return;
    }

    const input = promptInput.value.trim();
    if (!input) {
      alert('Please enter some input variables or content.');
      return;
    }

    btnRun.disabled = true;
    btnRun.innerHTML = '<span class="material-symbols-outlined pg-spin pg-btn-icon" aria-hidden="true">refresh</span> Running...';
    
    promptOutput.textContent = 'Executing prompt on AI backend...';
    promptOutput.className = 'pg-output pg-output--loading';

    try {
      const res = await fetch(API + `/api/prompts/${promptId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input })
      });
      
      const data = await res.json();

      if (data.success) {
        promptOutput.textContent = data.data.output;
        promptOutput.className = 'pg-output pg-output--success';
        fetchExecutions();
      } else {
        promptOutput.textContent = 'Error: ' + (data.message || 'Execution failed');
        promptOutput.className = 'pg-output pg-output--error';
      }
    } catch (error) {
      console.error('Error running prompt', error);
      promptOutput.textContent = 'Error: Failed to connect to execution server.';
      promptOutput.className = 'pg-output pg-output--error';
    } finally {
      btnRun.disabled = false;
      btnRun.innerHTML = '<span class="material-symbols-outlined pg-btn-icon" aria-hidden="true">play_arrow</span> Run Prompt';
    }
  });

  // Initial load
  fetchPrompt();
  fetchExecutions();
});
