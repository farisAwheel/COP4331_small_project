const SEARCH_ENDPOINT = '/LAMPAPI/searchContact.php';
const ADD_ENDPOINT    = '/LAMPAPI/createContact.php';
const UPDATE_ENDPOINT = '/LAMPAPI/updateContact.php';
const DELETE_ENDPOINT = '/LAMPAPI/deleteContact.php';

async function fetchContacts(search = '') {
  const auth = getAuth();
  if (!auth || !auth.id) {
    setMessage(document.getElementById('dashMsg'), 'You must be logged in.', 'error');
    return [];
  }
  const { ok, data } = await postJson(SEARCH_ENDPOINT, { user_id: auth.id, query: search });
  if (ok && data && data.error === '' && Array.isArray(data.result)) return data.result;
  setMessage(document.getElementById('dashMsg'), (data && data.error) || 'Unable to load contacts.', 'error');
  return [];
}

async function addContact(name, email, phone) {
  const auth = getAuth();
  if (!auth || !auth.id) return;
  const { ok, data } = await postJson(ADD_ENDPOINT, { user_id: auth.id, name, email, phone });
  if (!(ok && data && data.error === '')) {
    setMessage(document.getElementById('dashMsg'), (data && data.error) || 'Unable to add contact.', 'error');
  }
}

async function updateContact(id, name, email, phone) {
  const auth = getAuth();
  if (!auth || !auth.id) return;
  const { ok, data } = await postJson(UPDATE_ENDPOINT, { user_id: auth.id, id, name, email, phone });
  if (!(ok && data && data.error === '')) {
    setMessage(document.getElementById('dashMsg'), (data && data.error) || 'Unable to update contact.', 'error');
  }
}

async function deleteContact(id) {
  const auth = getAuth();
  if (!auth || !auth.id) return;
  const { ok, data } = await postJson(DELETE_ENDPOINT, { user_id: auth.id, id });
  if (!(ok && data && data.error === '')) {
    setMessage(document.getElementById('dashMsg'), (data && data.error) || 'Unable to delete contact.', 'error');
  }
}

const modal      = () => document.getElementById('contactModal');
const form       = () => document.getElementById('contactForm');
const titleEl    = () => document.getElementById('contactModalTitle');
const idInput    = () => document.getElementById('c-id');
const nameInput  = () => document.getElementById('c-name');
const emailInput = () => document.getElementById('c-email');
const phoneInput = () => document.getElementById('c-phone');
const formMsg    = () => document.getElementById('formMsg');

function setModalInputStyles(on){
  [nameInput(), emailInput(), phoneInput()].forEach(el=>{
    if(!el) return;
    if(on){
      el.style.color = '#111';
      el.style.caretColor = '#111';
      el.style.background = '#fff';
      el.style.borderColor = '#d0d6db';
      el.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,.08)';
      el.style.paddingLeft = '14px';
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
    } else {
      el.removeAttribute('style');
    }
  });
}

function openModal(mode, contact = null) {
  form().dataset.mode = mode;
  titleEl().textContent = mode === 'edit' ? 'Edit Contact' : 'Add Contact';
  idInput().value    = contact?.id    || '';
  nameInput().value  = contact?.name  || '';
  emailInput().value = contact?.email || '';
  phoneInput().value = contact?.phone || '';
  formMsg().textContent = '';
  setModalInputStyles(true);
  modal().classList.remove('hidden');
  nameInput().focus();
}

function closeModal() {
  setModalInputStyles(false);
  modal().classList.add('hidden');
}

function confirmModal(message = 'Delete this contact?', confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'confirmModal';
    wrap.className = 'modal';
    wrap.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle" style="margin:0 0 8px 0;">Confirm</h2>
        <p style="margin:0 0 16px 0;">${message}</p>
        <div class="buttons">
          <button id="confirmYes" class="btn primary" type="button">${confirmLabel}</button>
          <button id="confirmNo" class="btn" type="button">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const yes = wrap.querySelector('#confirmYes');
    const no  = wrap.querySelector('#confirmNo');
    const done = (val) => { document.removeEventListener('keydown', onKey); wrap.remove(); resolve(val); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
    yes.addEventListener('click', () => done(true));
    no.addEventListener('click',  () => done(false));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done(false); });
    document.addEventListener('keydown', onKey);
    yes.focus();
  });
}

function renderRows(rows) {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="padding:12px;">No contacts found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  rows.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:12px;">${c.name || ''}</td>
      <td style="padding:12px;">${c.email || ''}</td>
      <td style="padding:12px;">${c.phone || ''}</td>
      <td style="padding:12px;">
        <button class="btn" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn" data-action="delete" data-id="${c.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const ok = await confirmModal('Delete this contact?', 'Delete');
      if (ok) {
        await deleteContact(id);
        await handleSearch();
      }
    });
  });

  tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const row = rows.find(r => String(r.id) === String(id));
      if (row) openModal('edit', row);
    });
  });
}

async function handleSearch() {
  setMessage(document.getElementById('dashMsg'), '');
  const q = (document.getElementById('searchInput').value || '').trim();
  const rows = await fetchContacts(q);
  renderRows(rows);
}

function greetUser() {
  const auth = getAuth();
  if (auth?.username) setMessage(document.getElementById('who'), `Welcome, ${auth.username}.`, 'success');
}

function wireDashboard() {
  greetUser();
  document.getElementById('searchBtn')?.addEventListener('click', handleSearch);
  document.getElementById('searchInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
  document.getElementById('showAddFormBtn')?.addEventListener('click', () => openModal('create'));
  document.getElementById('cancelModalBtn')?.addEventListener('click', () => closeModal());
  form()?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = form().dataset.mode;
    const id    = idInput().value.trim();
    const name  = nameInput().value.trim();
    const email = emailInput().value.trim();
    const phone = (phoneInput().value || '').trim();
    if (!name || !email || !phone) {
      formMsg().textContent = 'Please fill out all fields.';
      return;
    }
    if (mode === 'edit') {
      await updateContact(id, name, email, phone);
    } else {
      await addContact(name, email, phone);
    }
    closeModal();
    await handleSearch();
  });
  const resultBar = document.getElementById('resultBar');
  if (resultBar) resultBar.classList.add('hidden');
  initLogoutHooks();
  handleSearch();
}

document.addEventListener('DOMContentLoaded', wireDashboard);