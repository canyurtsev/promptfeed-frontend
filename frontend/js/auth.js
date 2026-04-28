/**
 * PromptFeed Auth Module
 * Handles login, register, token storage, and route guards.
 */

const API_BASE = 'http://localhost:5000';

// ----------------------------------------
// Token helpers
// ----------------------------------------
const Auth = {
    getToken() { return localStorage.getItem('accessToken'); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    },
    isLoggedIn() { return !!this.getToken(); },
    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = 'signin.html';
    },
    save(data) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
    },
    headers() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
};

// ----------------------------------------
// API helpers
// ----------------------------------------
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

// ----------------------------------------
// Login
// ----------------------------------------
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const err = document.getElementById('form-error');

    const emailOrUsername = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    if (err) err.textContent = '';

    try {
        const data = await apiPost('/api/auth/login', { emailOrUsername, password });
        if (data.success) {
            Auth.save(data.data);
            window.location.href = 'community.html';
        } else {
            if (err) err.textContent = data.message || 'Login failed. Check your credentials.';
        }
    } catch (ex) {
        if (err) err.textContent = 'Connection error — is the backend running?';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign in';
    }
}

// ----------------------------------------
// Register
// ----------------------------------------
async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const err = document.getElementById('form-error');

    const username = form.querySelector('#username').value.trim();
    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    if (!username || !email || !password) {
        if (err) err.textContent = 'All fields are required.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account…';
    if (err) err.textContent = '';

    try {
        const data = await apiPost('/api/auth/register', { username, email, password });
        if (data.success) {
            Auth.save(data.data);
            window.location.href = 'community.html';
        } else {
            if (err) err.textContent = data.message || 'Registration failed.';
        }
    } catch (ex) {
        if (err) err.textContent = 'Connection error — is the backend running?';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create account';
    }
}

// ----------------------------------------
// Route guard (call on protected pages)
// ----------------------------------------
function requireAuth(redirectTo = 'signin.html') {
    if (!Auth.isLoggedIn()) {
        window.location.href = redirectTo;
    }
}

// ----------------------------------------
// Toast helper (usable from any page)
// ----------------------------------------
function showToast(msg, duration = 2500) {
    const t = document.createElement('div');
    t.className = 'pf-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}
