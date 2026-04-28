import re
import os

with open('html/marketplace.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace static onclicks
html = html.replace('onclick="closeGate()"', 'id="btn-close-gate"')
html = html.replace('onclick="gotoSignin()"', 'id="btn-goto-signin"')

# Replace category onclicks
categories = ['', 'prompt', 'skill', 'workflow', 'Coding', 'Marketing', 'Security', 'Automation']
for cat in categories:
    html = html.replace(f'onclick="setCategory(this,\'{cat}\')"', f'data-action="setCategory" data-val="{cat}"')

# Replace price onclicks
prices = ['free', 'premium']
for p in prices:
    html = html.replace(f'onclick="setPrice(this,\'{p}\')"', f'data-action="setPrice" data-val="{p}"')

# Replace onchange
html = html.replace('onchange="loadProducts()"', '') # We already have id="sort-select", we'll bind it in JS

# Extract script
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
script_content = script_match.group(1).strip() if script_match else ''

# Remove inline script and add external link
html = re.sub(r'<script>.*?</script>', '<script src="js/pages/marketplace.js" defer></script>', html, flags=re.DOTALL)

with open('html/marketplace.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now process script_content
# Avatar click
script_content = script_content.replace('onclick="window.location.href=\'signin.html\'"', 'id="user-avatar-btn"')

# Render Card replaces
script_content = script_content.replace('onclick="window.location.href=\'prompt-detail.html?id=${esc(p.promptId||p.id)}\'"', 'data-action="gotoDetail" data-id="${esc(p.promptId||p.id)}"')
script_content = script_content.replace('onclick="event.stopPropagation()"', 'data-action="stopProp"')
script_content = script_content.replace('onclick="handleBuy(\'${esc(p.id)}\',\'${esc(p.title||'')}\',\'${esc(String(p.price||\'0\'))}\')"', 'data-action="buy" data-id="${esc(p.id)}" data-title="${esc(p.title||\'\')}" data-price="${esc(String(p.price||\'0\'))}"')

# Remove window. assignments
script_content = script_content.replace('window.closeGate=closeGate; window.gotoSignin=gotoSignin;', '')
script_content = script_content.replace('window.setCategory=setCategory; window.setPrice=setPrice;', '')
script_content = script_content.replace('window.handleBuy=handleBuy;', '')

# Replace the old event listener for pf-gate
script_content = script_content.replace("document.getElementById('pf-gate').addEventListener('click',e=>{ if(e.target.id==='pf-gate') closeGate(); });", "")

# Add static event listeners and delegation
delegation = '''
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);
  
  const sortSelect = document.getElementById('sort-select');
  if(sortSelect) sortSelect.addEventListener('change', loadProducts);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }

    const setCatBtn = e.target.closest('[data-action="setCategory"]');
    if (setCatBtn) {
      setCategory(setCatBtn, setCatBtn.dataset.val);
      return;
    }

    const setPriceBtn = e.target.closest('[data-action="setPrice"]');
    if (setPriceBtn) {
      setPrice(setPriceBtn, setPriceBtn.dataset.val);
      return;
    }

    const buyBtn = e.target.closest('[data-action="buy"]');
    if (buyBtn) {
      e.stopPropagation();
      handleBuy(buyBtn.dataset.id, buyBtn.dataset.title, buyBtn.dataset.price, e);
      return;
    }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'prompt-detail.html?id=' + detailBtn.dataset.id;
      return;
    }
    
    const stopProp = e.target.closest('[data-action="stopProp"]');
    if (stopProp) {
      e.stopPropagation();
      // Let the click die here so the card isn't clicked
    }
  });
});

// Update handleBuy to use event target if needed since it was previously relying on event.target directly
const originalHandleBuy = handleBuy;
handleBuy = async function(productId, title, price, e) {
  if(!requireAuth('purchase prompts')) return;
  const btn = e ? e.target.closest('[data-action="buy"]') : null;
  if (!btn) return;
  const origText = btn.textContent;
  btn.textContent = 'Buying...'; 
  btn.disabled = true;
  try {
    const r=await fetch(API+'/api/marketplace/purchase',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({productId})
    });
    const d=await r.json();
    const rid=d.requestId?` [${d.requestId}]`:'';
    if(d.success){
      toast('✅ Purchase successful! "'+title+'" is now yours.');
      try{
        const u=await fetch(API+'/api/users/me',{headers:{Authorization:'Bearer '+token}});
        const ud=await u.json();
        if(ud.success&&ud.data){
          currentUser=ud.data;
          const wb=document.getElementById('wallet-bal');
          if(wb) wb.textContent=String(ud.data.walletBalance??'—');
        }
      } catch{}
    } else {
      toast('⚠ Purchase failed: '+(d.message||'Unknown error')+rid, false);
    }
  } catch(err){
    toast('⚠ Connection error: '+err.message, false);
  }
  btn.textContent=origText; 
  btn.disabled=false;
}

'''

# Wait, I should not redefine `handleBuy` if it is a `function handleBuy` in the original script. 
# The original has `async function handleBuy(productId, title, price)`. 
# It uses `const btn=event.target;` globally inside.
# I will replace `const btn=event.target;` with `const btn=e ? e.target.closest('[data-action="buy"]') : null;`
script_content = script_content.replace('async function handleBuy(productId, title, price){', 'async function handleBuy(productId, title, price, e){')
script_content = script_content.replace('const btn=event.target;', 'const btn=e ? e.target.closest(\'[data-action="buy"]\') : null; if (!btn) return;')

# Remove the redefined handleBuy from delegation string
delegation = delegation.split('// Update handleBuy')[0]

script_content += '\n' + delegation + '\n'

# Make sure html/js/pages exists
os.makedirs('html/js/pages', exist_ok=True)

with open('html/js/pages/marketplace.js', 'w', encoding='utf-8') as f:
    f.write(script_content)
