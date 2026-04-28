import re
import os

with open('html/skills.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace static onclicks
html = html.replace('onclick="closeGate()"', 'id="btn-close-gate"')
html = html.replace('onclick="gotoSignin()"', 'id="btn-goto-signin"')

# Replace category onclicks
categories = ['', 'Agent Behavior', 'Tool Use', 'Reasoning', 'Security', 'Automation', 'Data', 'Coding']
for cat in categories:
    html = html.replace(f"onclick=\"setCategory('{cat}')\"", f'data-action="setCategory" data-val="{cat}"')

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/skills.js" defer></script>', html, flags=re.DOTALL)

with open('html/skills.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
# Avatar click
script_content = script_content.replace('onclick="window.location.href=\'signin.html\'"', 'id="user-avatar-btn"')

# Render Card replaces
script_content = script_content.replace('onclick="window.location.href=\'skill-detail.html?id=${esc(s.id)}\'"', 'data-action="gotoDetail" data-id="${esc(s.id)}"')
script_content = script_content.replace('onclick="event.stopPropagation()"', 'data-action="stopProp"')
script_content = script_content.replace('onclick="handleCopy(\'${esc(s.id)}\', event)"', 'data-action="copy" data-id="${esc(s.id)}"')
script_content = script_content.replace('onclick="handleDownload(\'${esc(s.id)}\', \'${esc(s.name||s.title)}\', event)"', 'data-action="download" data-id="${esc(s.id)}" data-title="${esc(s.name||s.title)}"')

# Remove window. assignments
script_content = script_content.replace('window.closeGate = closeGate; window.gotoSignin = gotoSignin;', '')
script_content = script_content.replace('window.setCategory = setCategory;', '')
script_content = script_content.replace('window.handleCopy = handleCopy;', '')
script_content = script_content.replace('window.handleDownload = handleDownload;', '')

# Replace the old event listener for pf-gate
script_content = script_content.replace("document.getElementById('pf-gate').addEventListener('click', e => { if(e.target.id==='pf-gate') closeGate(); });", "")

# Add static event listeners and delegation
delegation = '''
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }

    const setCatBtn = e.target.closest('[data-action="setCategory"]');
    if (setCatBtn) {
      setCategory(setCatBtn.dataset.val);
      return;
    }

    const copyBtn = e.target.closest('[data-action="copy"]');
    if (copyBtn) {
      e.stopPropagation();
      handleCopy(copyBtn.dataset.id, e);
      return;
    }

    const downloadBtn = e.target.closest('[data-action="download"]');
    if (downloadBtn) {
      e.stopPropagation();
      handleDownload(downloadBtn.dataset.id, downloadBtn.dataset.title, e);
      return;
    }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'skill-detail.html?id=' + detailBtn.dataset.id;
      return;
    }
    
    const stopProp = e.target.closest('[data-action="stopProp"]');
    if (stopProp) {
      e.stopPropagation();
    }
  });
});

'''

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/skills.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
