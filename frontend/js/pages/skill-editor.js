/**
 * Skill Editor Page Controller
 */
const API = 'http://localhost:5000';

// Initialize Markdown Editor
let simplemde;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof SimpleMDE !== 'undefined') {
        simplemde = new SimpleMDE({
            element: document.getElementById("skill-editor"),
            spellChecker: false,
            placeholder: "# Task Definition\nDescribe the main task for the AI...\n\n# Constraints\n- Constraint 1\n- Constraint 2\n\n# Reasoning Steps\n1. First do X\n2. Then do Y",
            status: ["lines", "words", "cursor"],
            autosave: { enabled: true, uniqueId: "skill-draft-1" }
        });
    }

    // Drag & Drop Handling
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('border-accent', 'bg-accent/5');
        };
        dropZone.ondragleave = () => {
            dropZone.classList.remove('border-accent', 'bg-accent/5');
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-accent', 'bg-accent/5');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        };
    }
});

function handleFile(file) {
    if (!file.name.endsWith('.md')) {
        alert('Please upload a .md file.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        if (simplemde) simplemde.value(e.target.result);
        const titleInput = document.getElementById('skill-title');
        if (titleInput) titleInput.value = file.name.replace('.md', '').replaceAll('-', ' ').replaceAll('_', ' ');
    };
    reader.readAsText(file);
}

// Test Terminal Logic
const runTestBtn = document.getElementById('run-test-btn');
if (runTestBtn) {
    runTestBtn.onclick = async () => {
        if (!simplemde) return;
        const content = simplemde.value().trim();
        const input = document.getElementById('test-input').value.trim();
        const out = document.getElementById('test-output');

        if (!content) {
            if (out) out.innerHTML = '<span class="text-red-400">Error: Skill logic is empty. Build something first.</span>';
            return;
        }

        runTestBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Compiling...';
        runTestBtn.disabled = true;
        if (out) out.innerHTML = '<span class="text-accent animate-pulse">Running skill simulation over secure port...</span>';

        try {
            const res = await fetch(`${API}/api/playground/run`, {
                method: 'POST',
                headers: Auth.isLoggedIn() ? Auth.headers() : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: content, userInput: input, model: 'gpt-4o' })
            });
            const data = await res.json();

            if (data.success) {
                if (out) out.innerHTML = `<div class="text-[10px] text-accent mb-2">BUILD SUCCESS (${data.data.output?.length} bytes)</div>${data.data.output || JSON.stringify(data.data)}`;
            } else {
                if (out) out.innerHTML = `<span class="text-red-400">Exception: ${data.message}</span>`;
            }
        } catch (e) {
            if (out) out.innerHTML = '<span class="text-red-400">Connection refused. Ensure backend is running.</span>';
        } finally {
            runTestBtn.innerHTML = '<span class="material-symbols-outlined text-sm">play_arrow</span> Run Logic';
            runTestBtn.disabled = false;
        }
    };
}

// Publish Function
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
    publishBtn.onclick = async () => {
        if (!simplemde) return;
        const title = document.getElementById('skill-title').value.trim();
        const description = document.getElementById('skill-desc').value.trim();
        const content = simplemde.value().trim();
        const tags = document.getElementById('skill-tags').value.trim();

        if (!title || !content) {
            alert('Title and Content are required!');
            return;
        }

        publishBtn.disabled = true;
        const originalText = publishBtn.textContent;
        publishBtn.textContent = 'PUBLISHING...';

        try {
            const res = await fetch(`${API}/api/skills`, {
                method: 'POST',
                headers: Auth.headers(),
                body: JSON.stringify({ title, description, content, tags })
            });
            const body = await res.json();

            if (body.success) {
                location.href = `skill-detail.html?id=${body.data.id}`;
            } else {
                throw new Error(body.message);
            }
        } catch (err) {
            alert('Publish failed: ' + err.message);
            publishBtn.disabled = false;
            publishBtn.textContent = originalText;
        }
    };
}
