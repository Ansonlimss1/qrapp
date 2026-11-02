(() => {
  const $ = (s) => document.querySelector(s);
  const store = { accounts: 'qrly.accounts.v1', session: 'qrly.session.v1', codes: 'qrly.codes.v1', profiles: 'qrly.profiles.v1' };
  let mode = 'login', selectedImage = '', activeScreen = 'home', showingCode = null, sortNewest = true;
  const accounts = () => JSON.parse(localStorage.getItem(store.accounts) || '{}');
  const getUser = () => localStorage.getItem(store.session);
  const allCodes = () => JSON.parse(localStorage.getItem(store.codes) || '{}');
  const allProfiles = () => JSON.parse(localStorage.getItem(store.profiles) || '{}');
  const profile = () => { const user=getUser(), data=allProfiles(), saved=data[user]||{}; return {username:saved.username||user.split('@')[0],theme:saved.theme==='dark'?'dark':'light'}; };
  const saveProfile = (updated) => { const data=allProfiles(); data[getUser()]={...profile(),...updated}; localStorage.setItem(store.profiles,JSON.stringify(data)); };
  const codesForUser = () => allCodes()[getUser()] || [];
  const saveCodes = (list) => { const data = allCodes(); data[getUser()] = list; localStorage.setItem(store.codes, JSON.stringify(data)); };
  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = (n) => new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric'}).format(new Date(n));

  function showAuth() { $('#homeView').classList.add('hidden'); $('#authView').classList.remove('hidden'); applyTheme('light'); setAuthMode('login'); }
  function openHome() {
    const user = getUser(); if (!user) return showAuth();
    $('#authView').classList.add('hidden'); $('#homeView').classList.remove('hidden');
    activeScreen='home'; refreshProfile(); setScreen('home');
    const hour = new Date().getHours(); $('#greeting').innerHTML = `${hour < 12 ? 'A brighter morning' : hour < 18 ? 'A little more organized' : 'Everything in its place'}<span class="period">.</span>`;
    $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
    render();
  }
  function setAuthMode(next) {
    mode = next; const signup = next === 'signup';
    $('#authEyebrow').textContent = signup ? 'MAKE YOURSELF AT HOME' : 'WELCOME BACK';
    $('#authTitle').textContent = signup ? 'Your QR wallet awaits.' : 'Good to see you.';
    $('#authSubtitle').textContent = signup ? 'Create an account to get started.' : 'Sign in to open your QR wallet.';
    $('#authSubmit').innerHTML = signup ? 'Create my account <span>↗</span>' : 'Sign in <span>↗</span>';
    $('#authSwitchText').textContent = signup ? 'Already have an account?' : 'New to qrly?';
    $('#authSwitch').textContent = signup ? 'Sign in' : 'Create an account';
    $('#confirmLabel').classList.toggle('hidden', !signup);
    $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('#authConfirm').required = signup; $('#authError').textContent = '';
  }
  async function digest(value) {
    if (!crypto.subtle) throw new Error('Please open this app in a secure browser (HTTPS or localhost) to sign in.');
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
  }
  function refreshProfile() {
    const user=getUser(), data=profile();
    $('#accountEmail').textContent=data.username; $('#avatar').textContent=data.username.charAt(0).toUpperCase();
    $('#profileEmail').textContent=user; $('#profileUsername').value=data.username;
    applyTheme(data.theme);
  }
  function applyTheme(theme) {
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#151b17':'#f5f6f2';
    document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
  }
  function setScreen(screen) {
    activeScreen=screen;
    document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.screen===screen));
    const isProfile=screen==='profile'; $('#profilePage').classList.toggle('hidden',!isProfile); $('.content-wrap').classList.toggle('hidden',isProfile);
    $('#crumb').textContent=isProfile?'My profile':screen==='favorites'?'Favorites':'All codes';
    if(isProfile){refreshProfile(); animateScreen($('#profilePage'));}
    else { $('#libraryTitle').textContent=screen==='favorites'?'Your favorites':'Your collection'; $('#collectionCaption').textContent=screen==='favorites'?'The ones you reach for most':'Your personal QR library'; animateScreen($('.content-wrap')); render(); }
  }
  function animateScreen(el){el.classList.remove('screen-enter'); void el.offsetWidth; el.classList.add('screen-enter');}
  $('#authSwitch').addEventListener('click', () => setAuthMode(mode === 'login' ? 'signup' : 'login'));
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const email = $('#authEmail').value.trim().toLowerCase(); const password = $('#authPassword').value;
    try {
      const data = accounts();
      if (mode === 'signup') {
        if (password !== $('#authConfirm').value) return $('#authError').textContent = 'Those passwords don’t match yet.';
        if (data[email]) return $('#authError').textContent = 'There’s already an account with that email. Sign in instead.';
        data[email] = await digest(password); localStorage.setItem(store.accounts, JSON.stringify(data));
        const savedProfiles=allProfiles(); savedProfiles[email]={username:email.split('@')[0],theme:'light'}; localStorage.setItem(store.profiles,JSON.stringify(savedProfiles));
      } else if (!data[email] || data[email] !== await digest(password)) return $('#authError').textContent = 'That email and password don’t match.';
      localStorage.setItem(store.session, email); openHome();
    } catch (err) { $('#authError').textContent = err.message || 'Could not save your account on this device.'; }
  });
  $('#profileForm').addEventListener('submit',e=>{
    e.preventDefault();const username=$('#profileUsername').value.trim().replace(/\s+/g,' ');const message=$('#profileMessage');message.classList.remove('error');
    if(username.length<2){message.textContent='Use at least 2 characters for your username.';message.classList.add('error');return;}
    $('#profileUsername').value=username;saveProfile({username});refreshProfile();message.textContent='Profile saved.';toast('Profile updated.');
  });
  $('#passwordForm').addEventListener('submit',async e=>{
    e.preventDefault();const message=$('#passwordMessage');message.classList.remove('error');message.textContent='';
    const current=$('#currentPassword').value,next=$('#newPassword').value,confirm=$('#confirmNewPassword').value;
    if(next!==confirm){message.textContent='Your new passwords don’t match.';message.classList.add('error');return;}
    try{const data=accounts(),user=getUser();if(data[user]!==await digest(current)){message.textContent='Your current password isn’t correct.';message.classList.add('error');return;}data[user]=await digest(next);localStorage.setItem(store.accounts,JSON.stringify(data));$('#passwordForm').reset();message.textContent='Password updated on this device.';toast('Password changed.');}
    catch(err){message.textContent=err.message||'Could not update the password.';message.classList.add('error');}
  });
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{const theme=button.dataset.themeChoice;saveProfile({theme});applyTheme(theme);toast(`${theme==='dark'?'Dark':'Light'} mode enabled.`);}));
  $('#signOut').addEventListener('click', () => { localStorage.removeItem(store.session); showAuth(); });
  $('#accountButton').addEventListener('click', () => setScreen('profile'));
  $('#topAccount').addEventListener('click', () => setScreen('profile'));
  $('#addTop').addEventListener('click', openAdd); $('#emptyAdd').addEventListener('click', openAdd);
  document.querySelectorAll('.nav-item,[data-screen="home"]').forEach(btn => btn.addEventListener('click', () => setScreen(btn.dataset.screen)));
  $('#searchInput').addEventListener('input', render);
  $('#sortButton').addEventListener('click', () => { sortNewest = !sortNewest; $('#sortButton').innerHTML = `${sortNewest ? 'Recently added' : 'Oldest first'} <span>⌄</span>`; render(); });

  function openAdd() {
    $('#qrForm').reset(); selectedImage = ''; $('#previewWrap').classList.add('hidden'); $('#uploadTitle').classList.remove('hidden'); $('#uploadHint').classList.remove('hidden'); $('#qrError').textContent = '';
    $('#addModal').classList.remove('hidden'); setTimeout(() => $('#qrName').focus(), 60);
  }
  function closeModal(id) { $('#' + id).classList.add('hidden'); }
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  $('#addModal').addEventListener('click', e => { if (e.target === $('#addModal')) closeModal('addModal'); });
  $('#qrFile').addEventListener('change', e => { const file = e.target.files && e.target.files[0]; if (file) loadImage(file); });
  const zone = $('#uploadZone');
  ['dragenter','dragover'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', e => { const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) loadImage(file); });
  function loadImage(file) {
    $('#qrError').textContent = '';
    if (!file.type.startsWith('image/')) return $('#qrError').textContent = 'Choose an image file to add your QR code.';
    if (file.size > 10 * 1024 * 1024) return $('#qrError').textContent = 'That image is over 10 MB. Try a smaller screenshot.';
    const reader = new FileReader(); reader.onerror = () => $('#qrError').textContent = 'Could not read that image. Try another screenshot.';
    reader.onload = () => {
      const img = new Image(); img.onerror = () => $('#qrError').textContent = 'Could not open that image. Try another screenshot.';
      img.onload = () => {
        // Resize large camera images locally so the offline wallet stays within browser storage limits.
        const max = 1800, scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        selectedImage = canvas.toDataURL('image/jpeg', .93); $('#imagePreview').src = selectedImage;
        $('#previewWrap').classList.remove('hidden'); $('#uploadTitle').classList.add('hidden'); $('#uploadHint').classList.add('hidden');
      }; img.src = reader.result;
    }; reader.readAsDataURL(file);
  }
  $('#removeImage').addEventListener('click', e => { e.stopPropagation(); selectedImage=''; $('#qrFile').value=''; $('#previewWrap').classList.add('hidden'); $('#uploadTitle').classList.remove('hidden'); $('#uploadHint').classList.remove('hidden'); });
  $('#qrForm').addEventListener('submit', e => {
    e.preventDefault(); if (!selectedImage) return $('#qrError').textContent = 'Add a QR screenshot to continue.';
    const name = $('#qrName').value.trim(); if (!name) return $('#qrError').textContent = 'Give your code a name so you can find it later.';
    const codes = codesForUser(); codes.unshift({id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),name,category:$('#qrCategory').value,accent:$('#qrAccent').value,image:selectedImage,favorite:false,created:Date.now()});
    try { saveCodes(codes); closeModal('addModal'); render(); toast('Saved to your QR wallet.'); }
    catch { $('#qrError').textContent = 'Your browser is out of storage. Remove a few large screenshots and try again.'; }
  });
  function render() {
    const all = codesForUser(); const favoriteCount = all.filter(c => c.favorite).length;
    $('#totalStat').textContent = all.length; $('#favoriteStat').textContent = favoriteCount; $('#navCount').textContent = all.length;
    const term = $('#searchInput').value.trim().toLowerCase();
    let list = all.filter(c => activeScreen !== 'favorites' || c.favorite).filter(c => `${c.name} ${c.category}`.toLowerCase().includes(term));
    list.sort((a,b) => sortNewest ? b.created-a.created : a.created-b.created);
    $('#qrGrid').innerHTML = list.map((c,i) => `<article class="qr-card" style="animation-delay:${Math.min(i,8)*45}ms"><div class="qr-card-image ${escapeHTML(c.accent)}" data-open="${escapeHTML(c.id)}" role="button" tabindex="0" aria-label="Show ${escapeHTML(c.name)} QR code"><img src="${c.image}" alt="${escapeHTML(c.name)} QR code" /><span class="view-overlay">Show QR code ↗</span></div><div class="qr-card-info"><div class="card-topline"><span class="category-tag">${escapeHTML(c.category)}</span><button class="heart-button ${c.favorite?'is-fav':''}" data-favorite="${escapeHTML(c.id)}" aria-label="${c.favorite?'Remove from':'Add to'} favorites">${c.favorite?'♥':'♡'}</button></div><h3 title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</h3><p>Added ${formatDate(c.created)}</p><div class="card-actions"><button class="card-show" data-open="${escapeHTML(c.id)}">Show to scan ↗</button><button class="delete-button" data-delete="${escapeHTML(c.id)}">Remove</button></div></div></article>`).join('');
    $('#qrGrid').classList.toggle('hidden', list.length === 0);
    const empty = $('#emptyState'); empty.classList.toggle('hidden', list.length !== 0);
    if (all.length === 0 && activeScreen !== 'favorites') { $('#emptyTitle').textContent='A fresh start.'; $('#emptyText').textContent='Add your first QR code and it’ll be right here whenever you need it.'; $('#emptyAdd').classList.remove('hidden'); }
    else if (term && list.length === 0) { $('#emptyTitle').textContent='No matches yet.'; $('#emptyText').textContent='Try another name or category.'; $('#emptyAdd').classList.add('hidden'); }
    else if (activeScreen === 'favorites' && list.length === 0) { $('#emptyTitle').textContent='Save a favorite.'; $('#emptyText').textContent='Tap the heart on a QR code and it’ll be easy to find here.'; $('#emptyAdd').classList.add('hidden'); }
    else { $('#emptyTitle').textContent='A fresh start.'; $('#emptyText').textContent='Add your first QR code and it’ll be right here whenever you need it.'; $('#emptyAdd').classList.remove('hidden'); }
    $('#qrGrid').querySelectorAll('[data-open]').forEach(el => { el.addEventListener('click', () => openViewer(el.dataset.open)); el.addEventListener('keydown', e => {if(e.key==='Enter'||e.key===' ') openViewer(el.dataset.open);}); });
    $('#qrGrid').querySelectorAll('[data-favorite]').forEach(el => el.addEventListener('click', () => { const items=codesForUser(), item=items.find(x=>x.id===el.dataset.favorite); if(item){item.favorite=!item.favorite;saveCodes(items);render();} }));
    $('#qrGrid').querySelectorAll('[data-delete]').forEach(el => el.addEventListener('click', () => { saveCodes(codesForUser().filter(x=>x.id!==el.dataset.delete)); render(); toast('QR code removed.'); }));
  }
  function openViewer(id) { showingCode=codesForUser().find(c=>c.id===id); if(!showingCode)return; $('#viewerName').textContent=showingCode.name; $('#viewerCategory').textContent=showingCode.category; $('#viewerImage').src=showingCode.image; updateViewerFavorite(); $('#viewer').classList.remove('hidden'); }
  function updateViewerFavorite(){ $('#viewerFavorite').innerHTML=showingCode.favorite?'♥ <span>Saved as favorite</span>':'♡ <span>Save as favorite</span>'; }
  $('#viewerClose').addEventListener('click',()=>closeModal('viewer'));
  $('#viewer').addEventListener('click',e=>{if(e.target===$('#viewer'))closeModal('viewer')});
  $('#viewerFavorite').addEventListener('click',()=>{if(!showingCode)return; const list=codesForUser(), item=list.find(c=>c.id===showingCode.id); item.favorite=!item.favorite; saveCodes(list); showingCode=item; updateViewerFavorite(); render();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal('addModal');closeModal('viewer')}});
  let toastTimer; function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500)}
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=5', {updateViaCache:'none'}).then(registration=>registration.update()).catch(() => {}));
  }
  openHome();
})();
