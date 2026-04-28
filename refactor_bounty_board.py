import re
import os

with open('html/bounty-board.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace static onclicks
html = html.replace('onclick="closeGate()"', 'id="btn-close-gate"')
html = html.replace('onclick="gotoSignin()"', 'id="btn-goto-signin"')

# Extract and replace setFilter calls
def replace_setFilter(match):
    t = match.group(1)
    v = match.group(2)
    return f'data-action="setFilter" data-type="{t}" data-val="{v}"'

html = re.sub(r'onclick="setFilter\(\'([^\']+)\', \'(.*?)\'\)"', replace_setFilter, html)

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/bounty-board.js" defer></script>', html, flags=re.DOTALL)

with open('html/bounty-board.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
# Avatar click
script_content = script_content.replace('onclick="window.location.href=\'signin.html\'"', 'id="user-avatar-btn"')

# Render Row replaces
script_content = script_content.replace('onclick="handleSubmit(\'${esc(b.id)}\')"', 'data-action="submitSolution" data-id="${esc(b.id)}"')

# Remove window. assignments
script_content = script_content.replace('window.closeGate = closeGate; window.gotoSignin = gotoSignin;', '')
script_content = script_content.replace('window.setFilter = setFilter;', '')
script_content = script_content.replace('window.handleSubmit = handleSubmit;', '')

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

    const setFilterBtn = e.target.closest('[data-action="setFilter"]');
    if (setFilterBtn) {
      setFilter(setFilterBtn.dataset.type, setFilterBtn.dataset.val);
      return;
    }

    const submitBtn = e.target.closest('[data-action="submitSolution"]');
    if (submitBtn) {
      handleSubmit(submitBtn.dataset.id);
      return;
    }
  });
});
'''

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/bounty-board.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
