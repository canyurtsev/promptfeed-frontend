import re
import os

with open('html/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace onkeydown
html = html.replace('onkeydown="if(event.key===\'Enter\')window.location.href=\'community.html?q=\'+encodeURIComponent(this.value)"', '')

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/index.js" defer></script>', html, flags=re.DOTALL)

with open('html/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
# Avatar click
script_content = script_content.replace('onclick="window.location.href=\'signin.html\'"', 'id="user-avatar-btn"')

# Add static event listeners and delegation
delegation = '''
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        window.location.href = 'community.html?q=' + encodeURIComponent(e.target.value);
      }
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }
  });
});
'''

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/index.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
