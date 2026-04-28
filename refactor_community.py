import re
import os

with open('html/community.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace static onclicks
html = html.replace('onclick="closeGate()"', 'id="btn-close-gate"')
html = html.replace('onclick="gotoSignin()"', 'id="btn-goto-signin"')
html = html.replace('onclick="closeNotif()"', 'id="btn-close-notif"')
html = html.replace('id="notif-overlay" class="pf-panel-overlay" id="btn-close-notif"', 'id="notif-overlay" class="pf-panel-overlay"')

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/community.js" defer></script>', html, flags=re.DOTALL)

with open('html/community.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
script_content = script_content.replace("onclick=\"filterByTag('${c.tag}')\"", 'data-action="filterByTag" data-tag="${c.tag}"')
script_content = script_content.replace("onclick=\"filterByTag('${t}')\"", 'data-action="filterByTag" data-tag="${t}"')
script_content = script_content.replace("onclick=\"handleVote('${esc(p.id)}',1,event)\"", 'data-action="vote" data-id="${esc(p.id)}" data-value="1"')
script_content = script_content.replace("onclick=\"handleVote('${esc(p.id)}',-1,event)\"", 'data-action="vote" data-id="${esc(p.id)}" data-value="-1"')
script_content = script_content.replace("onclick=\"filterByTag('${esc(t)}');event.stopPropagation()\"", 'data-action="filterByTag" data-tag="${esc(t)}"')
script_content = script_content.replace("onclick=\"handleBookmark('${esc(p.id)}',event)\"", 'data-action="bookmark" data-id="${esc(p.id)}"')
script_content = script_content.replace("onclick=\"window.location.href='skill-detail.html?id=${esc(s.id)}'\"", 'data-action="gotoSkill" data-id="${esc(s.id)}"')

# Remove window. assignments for handlers
script_content = script_content.replace('window.closeGate = closeGate;', '')
script_content = script_content.replace('window.gotoSignin = gotoSignin;', '')
script_content = script_content.replace('window.closeNotif = closeNotif;', '')
script_content = script_content.replace('window.filterByTag = filterByTag;', '')
script_content = script_content.replace('window.handleVote = handleVote;', '')
script_content = script_content.replace('window.handleBookmark = handleBookmark;', '')

# Replace the old event listener for pf-gate
script_content = script_content.replace("document.getElementById('pf-gate').addEventListener('click', e => { if (e.target.id==='pf-gate') closeGate(); });", "")

# Add static event listeners and delegation
delegation = '''
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);
  document.getElementById('btn-close-notif')?.addEventListener('click', closeNotif);
  document.getElementById('notif-overlay')?.addEventListener('click', closeNotif);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    const filterBtn = e.target.closest('[data-action="filterByTag"]');
    if (filterBtn) {
      e.stopPropagation();
      filterByTag(filterBtn.dataset.tag);
      return;
    }

    const voteBtn = e.target.closest('[data-action="vote"]');
    if (voteBtn) {
      e.stopPropagation();
      handleVote(voteBtn.dataset.id, parseInt(voteBtn.dataset.value), e);
      return;
    }

    const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
    if (bookmarkBtn) {
      e.stopPropagation();
      handleBookmark(bookmarkBtn.dataset.id, e);
      return;
    }

    const skillRow = e.target.closest('[data-action="gotoSkill"]');
    if (skillRow) {
      window.location.href = 'skill-detail.html?id=' + skillRow.dataset.id;
      return;
    }
  });
});
'''

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/community.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
