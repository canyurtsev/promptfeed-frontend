import re
import os

with open('html/prompt-detail.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace static onclicks
html = html.replace('onclick="closeGate()"', 'id="btn-close-gate"')
html = html.replace('onclick="gotoSignin()"', 'id="btn-goto-signin"')

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/prompt-detail.js" defer></script>', html, flags=re.DOTALL)

with open('html/prompt-detail.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
script_content = script_content.replace('onclick="window.location.href=\'signin.html\'"', 'id="user-avatar-btn"')
script_content = script_content.replace('id="buy-btn" onclick="handleBuy()"', 'id="buy-btn"')
script_content = script_content.replace('onclick="handleRun()"', 'id="run-btn"')
script_content = script_content.replace('onclick="handleBookmark()"', 'id="bookmark-btn"')

# Remove window. assignments for handlers
script_content = script_content.replace('window.closeGate = closeGate; window.gotoSignin = gotoSignin;', '')
script_content = script_content.replace('window.closeGate = closeGate;', '')
script_content = script_content.replace('window.gotoSignin = gotoSignin;', '')

# Replace the old event listener for pf-gate
script_content = script_content.replace("document.getElementById('pf-gate').addEventListener('click', e => { if(e.target.id==='pf-gate') closeGate(); });", "")
script_content = script_content.replace("document.getElementById('pf-gate').addEventListener('click', e => { if (e.target.id==='pf-gate') closeGate(); });", "")

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

    if (e.target.closest('#buy-btn')) {
      handleBuy();
      return;
    }

    if (e.target.closest('#run-btn')) {
      handleRun();
      return;
    }

    if (e.target.closest('#bookmark-btn')) {
      handleBookmark();
      return;
    }
  });
});
'''

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/prompt-detail.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
