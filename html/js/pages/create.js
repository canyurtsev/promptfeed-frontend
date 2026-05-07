/* ================================================================
   create.html - Prompt creation controller
   Direct API calls only. No mock data.
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';

function showMessage(message, type) {
  const box = document.getElementById('create-message');
  box.textContent = message;
  box.className = 'create-message create-message--' + type;
}

function clearMessage() {
  const box = document.getElementById('create-message');
  box.textContent = '';
  box.className = 'create-message';
}

function cleanTags(value) {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .join(',');
}

async function readError(res) {
  try {
    const data = await res.json();
    if (data.message) return data.message;
    if (data.error?.message) return data.error.message;
    if (Array.isArray(data.error?.details) && data.error.details.length) {
      return data.error.details.map(item => item.message).join(' ');
    }
    return 'Unable to create prompt.';
  } catch {
    return 'Unable to create prompt.';
  }
}

function setSubmitting(isSubmitting) {
  const button = document.getElementById('create-submit');
  button.disabled = isSubmitting;
  button.dataset.defaultText = button.dataset.defaultText || button.textContent.trim();
  button.lastChild.textContent = isSubmitting ? ' Publishing...' : ' Publish';
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessage();

  const token = localStorage.getItem('accessToken');
  if (!token) {
    showMessage('Sign in before creating a prompt.', 'error');
    return;
  }

  const title = document.getElementById('prompt-title').value.trim();
  const description = document.getElementById('prompt-description').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  const tags = cleanTags(document.getElementById('prompt-tags').value);
  const category = document.getElementById('prompt-category')?.value || '';

  if (!title || !content || !tags) {
    showMessage('Title, content, and tags are required.', 'error');
    return;
  }

  const rawPrice = document.getElementById('prompt-price')?.value;
  let price = 0;
  if (rawPrice) {
    price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      showMessage('Price cannot be negative.', 'error');
      return;
    }
    price = Math.round(price * 100) / 100;
  }

  const payload = {
    title,
    description,
    content,
    tags,
    category: category || undefined,
    price
  };

  setSubmitting(true);

  try {
    const res = await fetch(API + '/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      showMessage(await readError(res), 'error');
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      showMessage(data.message || data.error?.message || 'Unable to create prompt.', 'error');
      setSubmitting(false);
      return;
    }

    window.location.href = 'community.html';
  } catch {
    showMessage('Network error. Ensure backend is running.', 'error');
    setSubmitting(false);
  }
}

function renderNavAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;

  const token = localStorage.getItem('accessToken');
  if (!token) {
    area.innerHTML = '<a href="signin.html?returnUrl=create.html" class="pf-btn pf-btn--ghost">Sign In</a>';
    return;
  }

  area.innerHTML = '<a href="profile.html" class="pf-btn pf-btn--ghost">Profile</a>';
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavAuth();
  document.getElementById('create-form')?.addEventListener('submit', handleSubmit);
});
