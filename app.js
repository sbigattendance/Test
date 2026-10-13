(() => {
  const dialog = document.querySelector('#panel');
  const content = document.querySelector('#panel-content');
  const toast = document.querySelector('#toast');
  const status = document.querySelector('#connection-status');
  const apiUrl = (window.REVIVE_CONFIG?.SHEETS_API_URL || '').trim();
  let session = null;
  let toastTimer;
  document.querySelector('#year').textContent = new Date().getFullYear();
  if (apiUrl) {
    status.querySelector('span:last-child').textContent = 'Google Sheets connection configured';
    status.querySelector('.status-dot').classList.add('live');
  }

  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => new Date().toISOString().slice(0,10);
  function notify(message) {
    toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function show(title, html, kicker = 'REVIVE FITNESS STUDIO') {
    document.querySelector('#panel-title').textContent = title;
    document.querySelector('#panel-kicker').textContent = kicker;
    content.innerHTML = `<div class="panel-body">${html}</div>`;
    dialog.showModal();
  }
  document.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  async function api(action, params = {}, method = 'GET') {
    if (!apiUrl) throw new Error('Google Sheets is not connected yet. Add the Apps Script URL in config.js.');
    if (method === 'GET') {
      // JSONP keeps read requests compatible with Apps Script web app CORS behavior.
      return new Promise((resolve, reject) => {
        const callback = `reviveCallback${Date.now()}${Math.floor(Math.random()*1000)}`;
        const script = document.createElement('script');
        const timer = setTimeout(() => { cleanup(); reject(new Error('The Sheets service did not respond. Check the Apps Script deployment.')); }, 12000);
        const cleanup = () => { clearTimeout(timer); delete window[callback]; script.remove(); };
        window[callback] = data => { cleanup(); if (data?.ok === false) reject(new Error(data.error || 'Request failed')); else resolve(data); };
        const query = new URLSearchParams({action, callback, ...params});
        script.onerror = () => { cleanup(); reject(new Error('Could not reach the Sheets service.')); };
        script.src = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${query}`;
        document.head.appendChild(script);
      });
    }
    // Writes use text/plain to avoid a browser preflight. Apps Script returns an opaque response in no-cors mode.
    await fetch(apiUrl, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action, ...params})});
    return {ok:true, queued:true};
  }
  function requireApiMessage() {
    return `<div class="notice">Connect your Google Sheet to activate this module. Add your deployed Apps Script web app URL to <code>config.js</code>. The interface is ready for the live connection.</div>`;
  }
  function field(label, name, type='text', attrs='') { const optional=attrs.includes('data-optional'); attrs=attrs.replace('data-optional',''); return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${attrs} ${optional?'':'required'}></div>`; }
  function formShell(id, fields, button='Continue', note='') { return `${note}${fields}<button class="primary" type="submit">${button}</button>`; }

  function openAdmission() {
    const fields = `<form id="admission-form"><div class="form-grid">
      ${field('Full name','name','text','autocomplete="name"')}${field('Mobile number','phone','tel','inputmode="numeric" pattern="[0-9 +()-]{8,16}" autocomplete="tel"')}
      ${field('Email (optional)','email','email','data-optional')}${field('Date of birth','dob','date','data-optional')}
      <div class="field"><label for="gender">Gender</label><select id="gender" name="gender"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></div>
      <div class="field"><label for="plan">Membership plan</label><select id="plan" name="plan" required><option value="">Select a plan</option><option>Monthly</option><option>Quarterly</option><option>Half-yearly</option><option>Annual</option></select></div>
      ${field('Start date','startDate','date',`value="${today()}"`)}${field('Emergency contact','emergencyPhone','tel','inputmode="tel" data-optional')}
      <div class="field full"><label for="goal">Fitness goal (optional)</label><textarea id="goal" name="goal" placeholder="Tell us what you would like to work towards"></textarea></div>
      </div><p class="helper">Your admission details will be recorded securely in the studio register.</p><button class="primary" type="submit">Submit admission request</button></form>`;
    show('Admission registration', apiUrl ? fields : requireApiMessage() + fields);
    document.querySelector('#admission-form')?.addEventListener('submit', async e => {
      e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget));
      const button = e.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Submitting…';
      try { await api('admission', data, 'POST'); e.currentTarget.innerHTML = '<div class="notice good">Admission request submitted. The studio team can now review and complete your registration.</div>'; }
      catch(err) { notify(err.message); button.disabled = false; button.textContent = 'Submit admission request'; }
    });
  }
  function openAttendance() {
    const fields = `<form id="attendance-form"><div class="form-grid">${field('Mobile number or member ID','member','text','autocomplete="off"')}${field('Date','date','date',`value="${today()}"`)}</div><p class="helper">Ask the member to provide the mobile number on their membership record.</p><button class="primary" type="submit">Find member</button></form><div id="attendance-result"></div>`;
    show('Daily attendance', apiUrl ? fields : requireApiMessage() + fields);
    document.querySelector('#attendance-form')?.addEventListener('submit', async e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); const out = document.querySelector('#attendance-result');
      out.innerHTML = '<p class="helper">Looking up member…</p>';
      try {
        const data = await api('lookupMember', {member:values.member});
        if (!data.member) { out.innerHTML = '<div class="notice error">No active member found. Check the details and try again.</div>'; return; }
        const m=data.member;
        out.innerHTML = `<div class="list-row"><div><strong>${esc(m.name)}</strong><small>${esc(m.memberId)} · ${esc(m.plan||'Member')}</small></div><span class="pill">${esc(m.status||'Active')}</span></div><button class="primary" id="mark-attendance">Mark present</button>`;
        document.querySelector('#mark-attendance').onclick = async ev => { ev.currentTarget.disabled=true; ev.currentTarget.textContent='Saving…'; try { await api('attendance',{memberId:m.memberId,name:m.name,date:values.date,token:session?.token},'POST'); out.innerHTML='<div class="notice good">Attendance recorded. Welcome to your workout!</div>'; } catch(err) {notify(err.message);ev.currentTarget.disabled=false;ev.currentTarget.textContent='Mark present';} };
      } catch(err) { out.innerHTML = `<div class="notice error">${esc(err.message)}</div>`; }
    });
  }
  function openStore() {
    show('Supplement store', apiUrl ? '<p class="helper">Studio supplements and current prices.</p><div id="products" class="product-grid"><div class="empty-state">Loading products…</div></div>' : requireApiMessage());
    if(!apiUrl) return;
    api('products').then(data => {
      const products=document.querySelector('#products'); if(!products) return;
      if(!data.products?.length){products.innerHTML='<div class="empty-state">No products are listed yet. Ask an admin to add products.</div>';return;}
      products.innerHTML=data.products.map(p=>`<div class="product-card"><div><strong>${esc(p.name)}</strong><small>${esc(p.description||'Available at the studio')}</small></div><span class="price">₹${esc(p.price)}</span><button class="secondary" data-product="${esc(p.id)}" data-name="${esc(p.name)}">Request</button></div>`).join('');
      products.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{ if(!session){notify('Please sign in as staff to record a sale.');openLogin('staff');return;} orderProduct(b.dataset.product,b.dataset.name); });
    }).catch(err=>{const p=document.querySelector('#products');if(p)p.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;});
  }
  async function sha256(text) { const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)); return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  function openLogin(role) {
    const label=role==='admin'?'Admin':'Staff';
    const fields=`<form id="login-form"><div class="form-grid">${field('Staff ID','username','text','autocomplete="username"')}${field('PIN','pin','password','inputmode="numeric" autocomplete="current-password"')}</div><p class="helper">Sign-in is verified by the studio sheet. Never share your PIN.</p><button class="primary" type="submit">Sign in</button></form>`;
    show(`${label} login`, apiUrl?fields:requireApiMessage()+fields);
    document.querySelector('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));const b=e.currentTarget.querySelector('button');b.disabled=true;b.textContent='Verifying…';try{const challenge=await api('challenge',{username:data.username},'GET');const proof=await sha256(`${await sha256(data.pin)}:${challenge.nonce}`);const result=await api('login',{username:data.username,proof,nonce:challenge.nonce,role},'GET');if(!result.token)throw new Error('Login was not accepted. Check the ID and PIN.');session={token:result.token,role:result.role||role,name:result.name||data.username};notify(`Signed in as ${session.name}`);if(session.role==='admin')adminDashboard();else staffDashboard();}catch(err){notify(err.message);b.disabled=false;b.textContent='Sign in';}});
  }
  async function staffDashboard() {
    show('Staff workspace',`<div class="notice good">Signed in as <strong>${esc(session?.name||'Staff')}</strong></div><div class="admin-nav"><button data-tab="checkin">Attendance</button><button data-tab="sales">Supplement sale</button><button data-tab="admissions">Recent admissions</button></div><div id="workspace"></div>`);
    document.querySelectorAll('.admin-nav button').forEach(b=>b.onclick=()=>staffTab(b.dataset.tab));staffTab('checkin');
  }
  async function staffTab(tab) {
    const el=document.querySelector('#workspace');if(!el)return;
    if(tab==='checkin'){el.innerHTML='<div class="empty-state">Use Daily Attendance from the home screen to find a member and check them in.</div>';return;}
    if(tab==='sales'){el.innerHTML=`<form id="sale-form"><div class="form-grid">${field('Member ID (optional)','memberId')}${field('Amount (₹)','amount','number','min="1" step="0.01"')}${field('Product','product')}${field('Quantity','quantity','number','min="1" value="1"')}</div><button class="primary">Record sale</button></form>`;document.querySelector('#sale-form').onsubmit=async e=>{e.preventDefault();try{await api('sale',{...Object.fromEntries(new FormData(e.currentTarget)),staff:session.name,token:session.token},'POST');notify('Sale recorded');e.currentTarget.reset();}catch(err){notify(err.message);}};return;}
    el.innerHTML='<div class="empty-state">Loading admission requests…</div>';try{const d=await api('admissions',{token:session.token});el.innerHTML=d.admissions?.length?`<div class="list">${d.admissions.map(a=>`<div class="list-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.phone)} · ${esc(a.plan)} · ${esc(a.createdAt||'')}</small></div><span class="pill">${esc(a.status||'Pending')}</span></div>`).join('')}</div>`:'<div class="empty-state">No new admissions.</div>';}catch(err){el.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;}
  }
  async function adminDashboard() {
    show('Admin dashboard',`<div class="notice good">Signed in as <strong>${esc(session?.name||'Admin')}</strong></div><div class="admin-nav"><button data-tab="overview">Overview</button><button data-tab="members">Members</button><button data-tab="attendance">Attendance</button><button data-tab="sales">Sales</button><button data-tab="staff">Staff</button><button data-tab="products">Products</button></div><div id="workspace"></div>`);
    document.querySelectorAll('.admin-nav button').forEach(b=>b.onclick=()=>adminTab(b.dataset.tab));adminTab('overview');
  }
  async function adminTab(tab) {
    const el=document.querySelector('#workspace');if(!el)return;
    document.querySelectorAll('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    if(tab==='overview'){el.innerHTML='<div class="empty-state">Loading studio summary…</div>';try{const d=await api('summary',{token:session.token});el.innerHTML=`<div class="metric-grid">${[['Active members',d.activeMembers],['Today attendance',d.todayAttendance],['Pending admissions',d.pendingAdmissions],['Today sales',`₹${d.todaySales||0}`]].map(([l,v])=>`<div class="metric"><strong>${esc(v??0)}</strong><span>${l}</span></div>`).join('')}</div>`;}catch(err){el.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;}return;}
    if(tab==='members'||tab==='attendance'||tab==='sales'||tab==='staff'||tab==='products'){
      el.innerHTML='<div class="empty-state">Loading…</div>';try{const d=await api(tab,{token:session.token});const rows=d[tab]||[];el.innerHTML=rows.length?`<div class="list">${rows.map(row=>`<div class="list-row"><div><strong>${esc(row.name||row.memberId||row.product||row.username||row.date||'Record')}</strong><small>${esc(Object.entries(row).filter(([k])=>!['name','memberId','product','username','date'].includes(k)).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(' · '))}</small></div>${row.status?`<span class="pill">${esc(row.status)}</span>`:''}</div>`).join('')}</div>`:'<div class="empty-state">No records found.</div>';}catch(err){el.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;}return;
    }
  }
  async function orderProduct(id,name){const qty=prompt(`Quantity of ${name}?`,'1');if(!qty)return;try{await api('sale',{productId:id,product:name,quantity:qty,staff:session.name,token:session.token},'POST');notify('Order recorded');}catch(err){notify(err.message);}}
  document.querySelectorAll('.module-card').forEach(card=>card.addEventListener('click',()=>{switch(card.dataset.action){case'admission':openAdmission();break;case'attendance':openAttendance();break;case'store':openStore();break;case'staff':openLogin('staff');break;case'admin':openLogin('admin');break;}}));
})();
