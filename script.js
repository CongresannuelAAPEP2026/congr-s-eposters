/* ============================================================
   CONFIGURATION — à renseigner avant la mise en ligne
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbyR1TIEwlk_XjRYlNnot3O6atLzGKwPY6C_HXH4fp8dnIawiazz9QTGmf5ak2346GwRwQ/exec"; // URL /exec du déploiement Google Apps Script (Code.gs)
const THEMES = ["Psychiatrie", "Neurologie", "Cardiologie", "Pédiatrie", "Santé publique", "Autre"];

let state = {
  publicView: "submit", // submit | poster  (top-level tab, ignored while in admin views)
  view: "submit",       // submit | submit-success | poster-lookup | poster-upload | poster-success | admin-gate | admin
  posterData: null,     // {name, type, dataUrl, size}
  lastSubmission: null, // {id, titre, auteur, email}
  lookupRecord: null,   // {id, email, statut, titre, posterNom}
  registrations: [],
  adminKey: null,
  reviewerName: null,
  adminError: "",
  expandedRows: {}
};

function render(){
  const app = document.getElementById('app');
  if(state.view === 'admin-gate'){
    app.innerHTML = adminGateHTML();
    bindAdminGate();
    return;
  }
  if(state.view === 'admin'){
    app.innerHTML = adminPanelHTML();
    bindAdminPanel();
    return;
  }
  app.innerHTML = publicShellHTML();
  bindPublicShell();
}

/* ---------------- Public shell (tabs + sidebar + content) ---------------- */

function publicShellHTML(){
  return `
    <div class="topbar">
      <div class="brand">E-posters — Congrès annuel de l'AAPEP 2026</div>
      <div class="tabs">
        <button data-tab="submit" class="${state.publicView==='submit'?'active':''}">Soumettre un résumé</button>
        <button data-tab="poster" class="${state.publicView==='poster'?'active':''}">Déposer mon poster</button>
      </div>
    </div>
    <div class="layout">
      <div class="sidebar">${sidebarHTML()}</div>
      <div class="form-side">${contentHTML()}</div>
    </div>
    <footer class="page">
      <button id="admin-link-btn">Espace jury / organisateur</button>
    </footer>
  `;
}

function sidebarHTML(){
  if(state.publicView === 'poster'){
    return `
      <div class="kicker">Étape 2 — Dépôt du poster</div>
      <h1>Vous avez été accepté ?</h1>
      <div class="sub">Le dépôt du poster n'est ouvert qu'aux résumés validés par le jury. Munissez-vous de votre identifiant et de l'e-mail utilisés lors de la soumission.</div>
      <div class="steps">
        <div class="step-item"><div class="step-num done">1</div><div class="step-text"><b>Soumission</b><br>Vous avez envoyé votre résumé et reçu un identifiant (ex. AP004).</div></div>
        <div class="step-item"><div class="step-num done">2</div><div class="step-text"><b>Évaluation</b><br>Le jury examine les résumés reçus.</div></div>
        <div class="step-item"><div class="step-num">3</div><div class="step-text"><b>Dépôt du poster</b><br>Si votre résumé est accepté, déposez ici votre poster définitif.</div></div>
      </div>
    `;
  }
  return `
    <div class="kicker">Étape 1 — Soumission du résumé</div>
    <h1>Congrès annuel de l'AAPEP 2026</h1>
    <div class="sub">Ce formulaire est réservé aux médecins invités à soumettre un résumé en vue d'une présentation en e-poster. Le poster lui-même sera demandé uniquement après acceptation par le jury.</div>
    <div class="req-title">Informations à préparer</div>
    <ul>
      <li>Titre du résumé</li>
      <li>Nom de l'auteur principal et e-mail</li>
      <li>Co-auteurs (le cas échéant)</li>
      <li>Affiliation / établissement</li>
      <li>Thème</li>
      <li>Texte du résumé</li>
    </ul>
    <div class="steps">
      <div class="step-item"><div class="step-num done">1</div><div class="step-text"><b>Soumission</b><br>Vous complétez ce formulaire (sans poster).</div></div>
      <div class="step-item"><div class="step-num">2</div><div class="step-text"><b>Évaluation par le jury</b><br>Vous recevrez la décision par e-mail.</div></div>
      <div class="step-item"><div class="step-num">3</div><div class="step-text"><b>Dépôt du poster</b><br>Uniquement si votre résumé est accepté.</div></div>
    </div>
  `;
}

function contentHTML(){
  if(state.publicView === 'poster'){
    if(state.view === 'poster-success') return posterSuccessHTML();
    if(state.view === 'poster-upload') return posterUploadHTML();
    return posterLookupHTML();
  }
  if(state.view === 'submit-success') return submitSuccessHTML();
  return submitFormHTML();
}

/* ---------------- Stage 1: abstract submission ---------------- */

function submitFormHTML(){
  return `
    <h2>Formulaire de soumission</h2>
    <div class="lead">Merci de compléter chaque champ. Le poster ne sera demandé qu'après acceptation de votre résumé.</div>
    <form id="submit-form" novalidate>
      <div class="field">
        <label for="titre">Titre du résumé</label>
        <input type="text" id="titre" name="titre">
      </div>
      <div class="row-2">
        <div class="field">
          <label for="auteur">Auteur (nom complet)</label>
          <input type="text" id="auteur" name="auteur" placeholder="ex. AHMED mouhamed">
        </div>
        <div class="field">
          <label for="email">E-mail de l'auteur</label>
          <input type="text" id="email" name="email" autocomplete="email" placeholder="vous@exemple.com">
        </div>
      </div>
      <div class="field">
        <label for="coauteurs">Co-auteurs <span style="font-weight:400;color:var(--ink-soft);">(optionnel)</span></label>
        <input type="text" id="coauteurs" name="coauteurs" placeholder="ex. A. jhon; A.mouhamed; M.steve">
      </div>
      <div class="row-2">
        <div class="field">
          <label for="affiliations">Affiliations</label>
          <input type="text" id="affiliations" name="affiliations" placeholder="Établissement, service">
        </div>
        <div class="field">
          <label for="theme">Thème</label>
          <input type="text" id="theme" name="theme" list="themes-list" placeholder="Choisir ou saisir un thème">
          <datalist id="themes-list">
            ${THEMES.map(t => `<option value="${escapeHtml(t)}">`).join('')}
          </datalist>
        </div>
      </div>
      <div class="field">
        <label for="texte">Texte du résumé</label>
        <textarea id="texte" name="texte" placeholder="Contexte, méthode, résultats, conclusion…"></textarea>
      </div>
      <div class="form-error" id="form-error"></div>
      <div class="submit-row">
        <button type="submit" class="primary" id="submit-btn">Envoyer mon résumé</button>
      </div>
    </form>
  `;
}

function submitSuccessHTML(){
  const s = state.lastSubmission || {};
  return `
    <div class="success-screen">
      <div class="mark">✓</div>
      <h2>Résumé bien reçu</h2>
      <p>Merci Dr. ${escapeHtml(s.auteur||'')}. Votre résumé « ${escapeHtml(s.titre||'')} » a été transmis au jury. Une confirmation a été envoyée à ${escapeHtml(s.email||'')}.</p>
      <div class="id-badge">${escapeHtml(s.id||'')}</div>
      <p style="margin-top:14px;font-size:13px;">Conservez cet identifiant : il vous sera demandé, avec votre e-mail, pour déposer votre poster si votre résumé est accepté.</p>
    </div>
  `;
}

/* ---------------- Stage 2: poster deposit ---------------- */

function posterLookupHTML(){
  return `
    <h2>Déposer mon poster</h2>
    <div class="lead">Saisissez l'identifiant reçu lors de votre soumission ainsi que l'e-mail utilisé.</div>
    <div id="lookup-notice"></div>
    <div class="row-2">
      <div class="field">
        <label for="lk-id">Identifiant de soumission</label>
        <input type="text" id="lk-id" placeholder="ex. AP004">
      </div>
      <div class="field">
        <label for="lk-email">E-mail utilisé lors de la soumission</label>
        <input type="text" id="lk-email" placeholder="vous@exemple.com">
      </div>
    </div>
    <div class="submit-row">
      <button type="button" class="primary" id="lookup-btn">Vérifier</button>
    </div>
  `;
}

function posterUploadHTML(){
  const r = state.lookupRecord || {};
  return `
    <h2>Déposer le poster</h2>
    <div class="lead">Résumé « ${escapeHtml(r.titre||'')} » — <span class="badge accepte">Accepté</span></div>
    ${r.posterNom ? `<div class="form-notice ok">Un poster (${escapeHtml(r.posterNom)}) a déjà été déposé pour cette soumission. Le déposer à nouveau remplacera l'ancien fichier côté organisation.</div>` : ''}
    <div class="field">
      <label>Fichier du poster</label>
      <div class="upload-box" id="upload-box">
        <div class="up-title">Cliquez pour choisir un fichier ou glissez-le ici</div>
        <div class="up-sub">Image (JPG, PNG) ou PDF — 5&nbsp;Mo maximum</div>
        <input type="file" id="poster-input" accept="image/png,image/jpeg,application/pdf" style="display:none;">
      </div>
      <div id="preview-slot"></div>
    </div>
    <div class="form-error" id="form-error"></div>
    <div class="submit-row">
      <button type="button" class="primary" id="upload-btn">Envoyer le poster</button>
      <button type="button" class="btn-ghost" id="upload-cancel">Retour</button>
    </div>
  `;
}

function posterSuccessHTML(){
  const r = state.lookupRecord || {};
  return `
    <div class="success-screen">
      <div class="mark">✓</div>
      <h2>Poster envoyé</h2>
      <p>Votre poster pour « ${escapeHtml(r.titre||'')} » a bien été transmis à l'organisation.</p>
    </div>
  `;
}

/* ---------------- Admin / jury ---------------- */

function adminGateHTML(){
  return `
    <div class="admin-overlay">
      <div class="admin-gate">
        <h3>Espace jury / organisateur</h3>
        <p>Indiquez votre nom et le mot de passe pour consulter les soumissions. Votre nom sera enregistré à chaque décision que vous prenez.</p>
        <input type="text" id="admin-name" placeholder="Votre nom" value="${escapeHtml(state.reviewerName||'')}">
        <input type="password" id="admin-pass" placeholder="Mot de passe">
        <div style="color:#9A3B2E;font-size:13px;margin:-6px 0 14px;">${state.adminError ? escapeHtml(state.adminError) : ''}</div>
        <div class="actions">
          <button class="btn-ghost" id="admin-cancel">Annuler</button>
          <button class="primary" id="admin-enter" style="padding:10px 16px;">Entrer</button>
        </div>
      </div>
    </div>
  `;
}

function statusBadge(statut){
  const s = statut || 'En attente';
  const cls = s === 'Accepté' ? 'accepte' : (s === 'Refusé' ? 'refuse' : 'attente');
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}

function adminPanelHTML(){
  const regs = state.registrations;
  const rows = regs.map(r => {
    const expanded = !!state.expandedRows[r.id];
    const texte = escapeHtml(r.texte || '');
    const shortTexte = texte.length > 90 ? texte.slice(0,90) + '…' : texte;
    return `
    <tr>
      <td><b>${escapeHtml(r.id)}</b></td>
      <td>${escapeHtml(r.titre)}</td>
      <td>${escapeHtml(r.auteur)}<br><span style="color:var(--ink-soft);font-size:11.5px;">${escapeHtml(r.email)}</span></td>
      <td>${escapeHtml(r.affiliations)}</td>
      <td>${escapeHtml(r.theme)}</td>
      <td class="texte-cell">${expanded ? texte : shortTexte} ${texte.length>90 ? `<div class="toggle" data-toggle="${escapeHtml(r.id)}">${expanded?'réduire':'voir tout'}</div>` : ''}</td>
      <td>
        <select class="status-select" data-status-id="${escapeHtml(r.id)}">
          ${['En attente','Accepté','Refusé'].map(s => `<option value="${s}" ${r.statut===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${r.decidePar ? escapeHtml(r.decidePar) : '—'}</td>
      <td>${r.posterLien ? `<a class="poster-link" href="${r.posterLien}" target="_blank" rel="noopener">${escapeHtml(r.posterNom||'Voir')}</a>` : '—'}</td>
      <td>${r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('fr-FR') : ''}</td>
    </tr>
  `;}).join('');

  const total = regs.length;
  const accepted = regs.filter(r => r.statut === 'Accepté').length;
  const posted = regs.filter(r => r.posterLien).length;

  return `
    <div class="admin-panel">
      <div class="admin-header">
        <h1>Soumissions e-posters</h1>
        <div class="admin-actions">
          <span class="count-pill">${total} soumission${total!==1?'s':''} · ${accepted} accepté${accepted!==1?'s':''} · ${posted} poster${posted!==1?'s':''} reçu${posted!==1?'s':''}</span>
          <button id="export-csv">Exporter en CSV</button>
          <button id="refresh-regs">Actualiser</button>
          <button class="primary" id="back-to-form">Retour au site</button>
        </div>
      </div>
      ${total === 0 ? `<div class="empty-state">Aucune soumission pour l'instant.</div>` : `
        <div style="overflow-x:auto;">
        <table class="reg-table">
          <thead>
            <tr>
              <th>ID</th><th>Titre</th><th>Auteur</th><th>Affiliations</th><th>Thème</th><th>Résumé</th><th>Statut</th><th>Décidé par</th><th>Poster</th><th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      `}
    </div>
  `;
}

/* ---------------- Bindings ---------------- */

function bindPublicShell(){
  document.querySelectorAll('.tabs [data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.publicView = btn.getAttribute('data-tab');
      state.view = state.publicView === 'poster' ? 'poster-lookup' : 'submit';
      state.lookupRecord = null;
      render();
    });
  });
  const adminBtn = document.getElementById('admin-link-btn');
  if(adminBtn){
    adminBtn.addEventListener('click', () => {
      state.view = 'admin-gate';
      state.adminError = '';
      render();
    });
  }

  if(state.publicView === 'submit' && state.view === 'submit'){
    bindSubmitForm();
  }
  if(state.publicView === 'poster'){
    if(state.view === 'poster-lookup') bindLookup();
    if(state.view === 'poster-upload') bindPosterUpload();
  }
}

function bindSubmitForm(){
  const form = document.getElementById('submit-form');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.style.display = 'none';

    const titre = document.getElementById('titre').value.trim();
    const auteur = document.getElementById('auteur').value.trim();
    const email = document.getElementById('email').value.trim();
    const coauteurs = document.getElementById('coauteurs').value.trim();
    const affiliations = document.getElementById('affiliations').value.trim();
    const theme = document.getElementById('theme').value.trim();
    const texte = document.getElementById('texte').value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const missing = [];
    if(!titre) missing.push('titre');
    if(!auteur) missing.push('auteur');
    if(!emailValid) missing.push('email');
    if(!affiliations) missing.push('affiliations');
    if(!theme) missing.push('theme');
    if(!texte) missing.push('texte');

    ['titre','auteur','email','affiliations','theme','texte'].forEach(id => {
      document.getElementById(id).classList.toggle('invalid', missing.includes(id));
    });

    if(missing.length){
      formError.style.display = 'block';
      formError.textContent = "Merci de compléter tous les champs obligatoires avec un e-mail valide.";
      return;
    }
    if(API_URL.indexOf('PASTE_YOUR') === 0){
      formError.style.display = 'block';
      formError.textContent = "Le formulaire n'est pas encore connecté au serveur (API_URL non configurée).";
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    try{
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action:'submit', titre, auteur, email, coauteurs, affiliations, theme, texte })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || 'Échec de la soumission');
      state.lastSubmission = { id: data.id, titre, auteur, email };
      state.view = 'submit-success';
      render();
    }catch(err){
      formError.style.display = 'block';
      formError.textContent = "Une erreur est survenue lors de l'envoi. Merci de réessayer.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer mon résumé";
    }
  });
}

function bindLookup(){
  const btn = document.getElementById('lookup-btn');
  const notice = document.getElementById('lookup-notice');
  btn.addEventListener('click', async () => {
    const id = document.getElementById('lk-id').value.trim();
    const email = document.getElementById('lk-email').value.trim();
    if(!id || !email){
      notice.innerHTML = `<div class="form-notice err">Merci de saisir l'identifiant et l'e-mail.</div>`;
      return;
    }
    if(API_URL.indexOf('PASTE_YOUR') === 0){
      notice.innerHTML = `<div class="form-notice err">Le site n'est pas encore connecté au serveur (API_URL non configurée).</div>`;
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Vérification…';
    try{
      const res = await fetch(API_URL, { method:'POST', body: JSON.stringify({ action:'checkStatus', id, email }) });
      const data = await res.json();
      btn.disabled = false;
      btn.textContent = 'Vérifier';
      if(!data.ok){
        notice.innerHTML = `<div class="form-notice err">${escapeHtml(data.error || "Identifiant ou e-mail incorrect.")}</div>`;
        return;
      }
      if(data.statut !== 'Accepté'){
        const msg = data.statut === 'Refusé'
          ? "Ce résumé n'a pas été retenu par le jury."
          : "Ce résumé est encore en cours d'évaluation par le jury. Revenez plus tard.";
        notice.innerHTML = `<div class="form-notice warn">${msg}</div>`;
        return;
      }
      state.lookupRecord = { id, email, statut: data.statut, titre: data.titre, posterNom: data.posterNom };
      state.view = 'poster-upload';
      render();
    }catch(err){
      btn.disabled = false;
      btn.textContent = 'Vérifier';
      notice.innerHTML = `<div class="form-notice err">Connexion au serveur impossible. Merci de réessayer.</div>`;
    }
  });
}

function bindPosterUpload(){
  const uploadBox = document.getElementById('upload-box');
  const fileInput = document.getElementById('poster-input');
  const previewSlot = document.getElementById('preview-slot');
  const formError = document.getElementById('form-error');

  document.getElementById('upload-cancel').addEventListener('click', () => {
    state.view = 'poster-lookup';
    state.lookupRecord = null;
    render();
  });

  function renderPreview(){
    if(!state.posterData){ previewSlot.innerHTML = ''; return; }
    const p = state.posterData;
    const isImg = p.type.startsWith('image/');
    previewSlot.innerHTML = `
      <div class="upload-preview">
        ${isImg ? `<img src="${p.dataUrl}">` : `<div class="file-icon">PDF</div>`}
        <div>${escapeHtml(p.name)}<br><span style="color:var(--ink-soft);font-size:12px;">${(p.size/1024/1024).toFixed(2)} Mo</span></div>
        <span class="remove" id="remove-poster">Retirer</span>
      </div>
    `;
    const rem = document.getElementById('remove-poster');
    if(rem) rem.addEventListener('click', () => { state.posterData = null; fileInput.value=''; renderPreview(); });
  }
  renderPreview();

  uploadBox.addEventListener('click', () => fileInput.click());
  uploadBox.addEventListener('dragover', e => { e.preventDefault(); uploadBox.classList.add('dragover'); });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox.addEventListener('drop', e => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if(e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file){
    const allowed = ['image/png','image/jpeg','application/pdf'];
    if(!allowed.includes(file.type)){
      formError.style.display = 'block';
      formError.textContent = "Format non supporté. Utilisez une image (JPG, PNG) ou un PDF.";
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if(file.size > maxBytes){
      formError.style.display = 'block';
      formError.textContent = "Le fichier dépasse 5 Mo. Merci de compresser le poster avant l'envoi.";
      return;
    }
    formError.style.display = 'none';
    const reader = new FileReader();
    reader.onload = () => {
      state.posterData = { name: file.name, type: file.type, dataUrl: reader.result, size: file.size };
      renderPreview();
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('upload-btn').addEventListener('click', async () => {
    formError.style.display = 'none';
    if(!state.posterData){
      formError.style.display = 'block';
      formError.textContent = "Merci de choisir un fichier avant d'envoyer.";
      return;
    }
    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    try{
      const r = state.lookupRecord;
      const res = await fetch(API_URL, {
        method:'POST',
        body: JSON.stringify({
          action:'uploadPoster', id:r.id, email:r.email,
          poster:{ name: state.posterData.name, dataUrl: state.posterData.dataUrl }
        })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Échec de l'envoi");
      state.posterData = null;
      state.view = 'poster-success';
      render();
    }catch(err){
      formError.style.display = 'block';
      formError.textContent = "Une erreur est survenue lors de l'envoi du poster. Merci de réessayer.";
      btn.disabled = false;
      btn.textContent = 'Envoyer le poster';
    }
  });
}

function bindAdminGate(){
  const nameInput = document.getElementById('admin-name');
  const passInput = document.getElementById('admin-pass');
  const enterBtn = document.getElementById('admin-enter');
  document.getElementById('admin-cancel').addEventListener('click', () => {
    state.view = state.publicView === 'poster' ? 'poster-lookup' : 'submit';
    render();
  });
  enterBtn.addEventListener('click', checkPassword);
  passInput.addEventListener('keydown', e => { if(e.key === 'Enter') checkPassword(); });
  nameInput.focus();

  async function checkPassword(){
    const name = nameInput.value.trim();
    if(!name){
      state.adminError = "Merci d'indiquer votre nom.";
      render();
      return;
    }
    if(API_URL.indexOf('PASTE_YOUR') === 0){
      state.adminError = "API_URL non configurée — voir les instructions de déploiement.";
      render();
      return;
    }
    enterBtn.disabled = true;
    enterBtn.textContent = 'Vérification…';
    const ok = await loadRegistrations(passInput.value);
    if(ok){
      state.adminKey = passInput.value;
      state.reviewerName = name;
      state.adminError = '';
      state.view = 'admin';
      render();
    }else{
      state.adminError = 'Mot de passe incorrect ou connexion impossible.';
      render();
    }
  }
}

// Le mot de passe est vérifié côté serveur (Code.gs), jamais comparé dans la page.
async function loadRegistrations(password){
  try{
    const res = await fetch(API_URL + '?key=' + encodeURIComponent(password));
    const data = await res.json();
    if(data.error){
      state.registrations = [];
      return false;
    }
    state.registrations = data.registrations || [];
    return true;
  }catch(e){
    state.registrations = [];
    return false;
  }
}

function bindAdminPanel(){
  document.getElementById('back-to-form').addEventListener('click', () => {
    state.view = state.publicView === 'poster' ? 'poster-lookup' : 'submit';
    render();
  });
  document.getElementById('refresh-regs').addEventListener('click', async () => {
    await loadRegistrations(state.adminKey);
    render();
  });
  document.getElementById('export-csv').addEventListener('click', () => {
    exportCSV(state.registrations);
  });
  document.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-toggle');
      state.expandedRows[id] = !state.expandedRows[id];
      render();
    });
  });
  document.querySelectorAll('[data-status-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.getAttribute('data-status-id');
      const statut = sel.value;
      sel.disabled = true;
      try{
        const res = await fetch(API_URL, {
          method:'POST',
          body: JSON.stringify({ action:'updateStatus', key: state.adminKey, id, statut, reviewer: state.reviewerName })
        });
        const data = await res.json();
        if(data.ok){
          const rec = state.registrations.find(r => r.id === id);
          if(rec){ rec.statut = statut; rec.decidePar = state.reviewerName; }
          render();
          return;
        }
      }catch(e){ /* laissera le select tel quel au prochain "Actualiser" */ }
      sel.disabled = false;
    });
  });
}

function exportCSV(regs){
  const headers = ['ID','Date','Titre','Auteur','Email','CoAuteurs','Affiliations','Theme','Statut','DecidePar','PosterNom','PosterLien'];
  const lines = [headers.join(',')];
  regs.forEach(r => {
    const row = [
      r.id, r.submittedAt ? new Date(r.submittedAt).toLocaleString('fr-FR') : '',
      r.titre, r.auteur, r.email, r.coauteurs, r.affiliations, r.theme, r.statut, r.decidePar, r.posterNom, r.posterLien
    ].map(v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"');
    lines.push(row.join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'soumissions_eposters.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str){
  return String(str==null?'':str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

render();
