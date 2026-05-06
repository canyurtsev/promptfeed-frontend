// js/pages/playground.js

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const promptId = urlParams.get('id');

    const promptTitle = document.getElementById('prompt-title');
    const promptInput = document.getElementById('prompt-input');
    const promptOutput = document.getElementById('prompt-output');
    const btnRun = document.getElementById('btn-run');
    const executionsList = document.getElementById('executions-list');
    const promptInfo = document.getElementById('prompt-info');

    // Authentication check
    const token = localStorage.getItem('pf_token');
    
    // Auth UI setup (similar to marketplace.js)
    const navAuthArea = document.getElementById('nav-auth-area');
    if (navAuthArea) {
        if (token) {
            try {
                const meRes = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    navAuthArea.innerHTML = `
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:13px;font-weight:600;color:var(--pf-text-primary)">${meData.data.username}</span>
                            <img src="${meData.data.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + meData.data.username}" style="width:32px;height:32px;border-radius:50%;background:var(--pf-surface)"/>
                            <button id="nav-btn-logout" class="pf-btn pf-btn--ghost" style="padding:6px 12px">Logout</button>
                        </div>
                    `;
                    document.getElementById('nav-btn-logout').addEventListener('click', () => {
                        localStorage.removeItem('pf_token');
                        window.location.reload();
                    });
                }
            } catch (e) {
                console.error('Error fetching user', e);
            }
        } else {
            navAuthArea.innerHTML = `
                <a href="login.html" class="pf-btn pf-btn--ghost">Sign in</a>
                <a href="register.html" class="pf-btn pf-btn--primary">Sign up</a>
            `;
        }
    }

    if (!promptId) {
        promptTitle.innerText = 'No Prompt ID specified.';
        promptTitle.style.color = 'var(--pf-danger)';
        promptInfo.style.display = 'block';
        btnRun.disabled = true;
        return;
    }

    async function fetchPrompt() {
        try {
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/prompts/${promptId}`, { headers });
            const data = await res.json();

            if (data.success) {
                promptInfo.style.display = 'block';
                promptTitle.innerText = data.data.title;
                promptInput.value = data.data.content || '';
            } else {
                promptInfo.style.display = 'block';
                promptTitle.innerText = 'Prompt not found or access denied.';
                promptTitle.style.color = 'var(--pf-danger)';
                btnRun.disabled = true;
            }
        } catch (error) {
            console.error('Error fetching prompt', error);
            promptTitle.innerText = 'Error loading prompt.';
        }
    }

    async function fetchExecutions() {
        if (!token) {
            executionsList.innerHTML = '<div style="font-size:12px;color:var(--pf-text-muted);">Sign in to view history</div>';
            return;
        }

        try {
            const res = await fetch('/api/users/me/executions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                executionsList.innerHTML = data.data.map(exec => `
                    <div class="exec-item" data-id="${exec.id}">
                        <div class="exec-title">${exec.prompt.title}</div>
                        <div class="exec-meta">${new Date(exec.createdAt).toLocaleString()}</div>
                    </div>
                `).join('');
            } else {
                executionsList.innerHTML = '<div style="font-size:12px;color:var(--pf-text-muted);">No recent executions</div>';
            }
        } catch (error) {
            console.error('Error fetching executions', error);
        }
    }

    btnRun.addEventListener('click', async () => {
        if (!token) {
            alert('Please sign in to run prompts.');
            return;
        }

        const input = promptInput.value.trim();
        if (!input) {
            alert('Please enter some input.');
            return;
        }

        btnRun.disabled = true;
        btnRun.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;margin-right:4px;animation:spin 1s linear infinite;">refresh</span> Running...';
        promptOutput.innerText = 'Running...';
        promptOutput.style.color = 'var(--pf-text-muted)';

        try {
            const res = await fetch(`/api/prompts/${promptId}/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ input })
            });
            
            const data = await res.json();

            if (data.success) {
                promptOutput.innerText = data.data.output;
                promptOutput.style.color = 'var(--pf-text-primary)';
                // Refresh executions
                fetchExecutions();
            } else {
                promptOutput.innerText = 'Error: ' + (data.message || 'Execution failed');
                promptOutput.style.color = 'var(--pf-danger)';
            }
        } catch (error) {
            console.error('Error running prompt', error);
            promptOutput.innerText = 'Error: Failed to connect to server';
            promptOutput.style.color = 'var(--pf-danger)';
        } finally {
            btnRun.disabled = false;
            btnRun.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;margin-right:4px">play_arrow</span> Run';
        }
    });

    // Add CSS for spinner
    const style = document.createElement('style');
    style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    // Initial load
    fetchPrompt();
    fetchExecutions();
});
