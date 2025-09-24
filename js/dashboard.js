const SEARCH_ENDPOINT = '/LAMPAPI/searchContact.php';
const ADD_ENDPOINT    = '/LAMPAPI/createContact.php';
const UPDATE_ENDPOINT = '/LAMPAPI/updateContact.php';
const DELETE_ENDPOINT = '/LAMPAPI/deleteContact.php';

async function fetchContacts(search = '') {
	const auth = getAuth();
	if (!auth || !auth.id) {
		showToast('Please sign in to continue.', { type: 'info' });
		window.location.replace('/index.html');
		return [];
	}
	const { ok, data } = await postJson(SEARCH_ENDPOINT, { user_id: auth.id, query: search });
	if (ok && data && data.error === '' && Array.isArray(data.result)) return data.result;
	setMessage(document.getElementById('dashMsg'), '');
	showToast((data && data.error) || 'Unable to load contacts.', { type: 'error' });
	return [];
}

async function addContact(name, email, phone) {
	const auth = getAuth();
	if (!auth || !auth.id) return;
	const { ok, data } = await postJson(ADD_ENDPOINT, { user_id: auth.id, name, email, phone });
	if (!(ok && data && data.error === '')) {
	  setMessage(document.getElementById('dashMsg'), '');
	  showToast((data && data.error) || 'Unable to add contact.', { type: 'error' });
	}
}

async function updateContact(id, name, email, phone) {
	const auth = getAuth();
	if (!auth || !auth.id) return;
	const { ok, data } = await postJson(UPDATE_ENDPOINT, { user_id: auth.id, id, name, email, phone });
	if (!(ok && data && data.error === '')) {
	  setMessage(document.getElementById('dashMsg'), '');
	  showToast((data && data.error) || 'Unable to update contact.', { type: 'error' });
	}
}

async function deleteContact(id) {
	const auth = getAuth();
	if (!auth || !auth.id) return;
	const { ok, data } = await postJson(DELETE_ENDPOINT, { user_id: auth.id, id });
	if (!(ok && data && data.error === '')) {
	  setMessage(document.getElementById('dashMsg'), '');
	  showToast((data && data.error) || 'Unable to delete contact.', { type: 'error' });
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

let _modalOpener = null;

function titleCase(str=''){
  return (str || '').replace(/\w\S*/g, s => s[0].toUpperCase() + s.slice(1).toLowerCase());
}

function updateResultCount(rows){
  const meta = document.querySelector('.table-meta');
  const el = document.getElementById('resultCount');
  if (!el || !meta) return;

  const y = Array.isArray(rows) ? rows.length : 0;

  if (y > 0) {
    el.textContent = `1–${y} of ${y}`;
    meta.hidden = false;
  } else {
    el.textContent = '';
    meta.hidden = true;
  }
}

function openModal(mode, contact = null) {
  const m = modal();
  if (!m) return;
  _modalOpener = document.activeElement;
  form().dataset.mode = mode;
  titleEl().textContent = mode === 'edit' ? 'Edit Contact' : 'Add Contact';
  idInput().value    = contact?.id    || '';
  nameInput().value  = contact?.name  || '';
  emailInput().value = contact?.email || '';
  phoneInput().value = contact?.phone || '';
  formMsg().textContent = '';

  m.hidden = false;

  const closeBtn = m.querySelector('.modal-close');
  const onBackdrop = (e) => { if (e.target === m) closeModal(); };
  const onEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } };

  m.addEventListener('click', onBackdrop, { once: true });
  document.addEventListener('keydown', onEsc, { once: true });
  closeBtn?.addEventListener('click', () => closeModal(), { once: true });

  nameInput().focus();
}

function closeModal() {
  const m = modal();
  if (!m) return;
  m.hidden = true;
  formMsg().textContent = '';
  if (_modalOpener && typeof _modalOpener.focus === 'function') {
    _modalOpener.focus();
  }
  _modalOpener = null;
}

function confirmModal(message = 'Delete this contact?', confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="modal-card" role="document">
        <button class="modal-close" type="button" aria-label="Close">×</button>
        <h2 class="modal-title" id="confirmTitle">Confirm</h2>
        <p class="modal-body">${message}</p>
        <div class="buttons">
          <button id="confirmYes" class="btn primary" type="button">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const yes = wrap.querySelector('#confirmYes');
    const closeBtn = wrap.querySelector('.modal-close');

    const done = (val) => {
      document.removeEventListener('keydown', onKey);
      wrap.remove();
      resolve(val);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };

    yes.addEventListener('click', () => done(true));
    closeBtn.addEventListener('click', () => done(false));
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
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="4">No contacts found.</td>`;
    tbody.appendChild(tr);
    updateResultCount(rows);
    return;
  }

  rows.forEach(c => {
    const tr = document.createElement('tr');
    const name = titleCase(c.name || '');
    tr.innerHTML = `
      <td>${name}</td>
      <td class="cell-email">${c.email || ''}</td>
      <td>${c.phone || ''}</td>
      <td class="col-actions">
        <div class="actions">
          <button class="icon-action edit" aria-label="Edit contact" data-action="edit" data-id="${c.id}"></button>
          <button class="icon-action delete" aria-label="Delete contact" data-action="delete" data-id="${c.id}"></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.icon-action.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const ok = await confirmModal('Delete this contact?', 'Delete');
      if (ok) {
        await deleteContact(id);
        await handleSearch();
      }
    });
  });

  tbody.querySelectorAll('.icon-action.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const row = rows.find(r => String(r.id) === String(id));
      if (row) openModal('edit', row);
    });
  });

  updateResultCount(rows);
}

async function handleSearch() {
  setMessage(document.getElementById('dashMsg'), '');
  const q = (document.getElementById('searchInput').value || '').trim();
  const rows = await fetchContacts(q);
  renderRows(rows);
}

function wireDashboard() {
  const whoEl = document.getElementById('who');
  if (whoEl) whoEl.hidden = true;

  if (typeof renderNavbarRight === 'function') renderNavbarRight();

  document.getElementById('searchGo')?.addEventListener('click', handleSearch);
  document.getElementById('searchInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });

  document.getElementById('showAddFormBtn')?.addEventListener('click', () => openModal('create'));

  const meta = document.querySelector('.table-meta');
  if (meta) meta.hidden = true;

  form()?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode  = form().dataset.mode;
    const id    = idInput().value.trim();
    const name  = nameInput().value.trim();
    const email = emailInput().value.trim();
    const phone = (phoneInput().value || '').trim();

    if (!name || !email || !phone) {
      formMsg().textContent = '';
      showToast('Please fill out all fields.', { type: 'error' });
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

  initLogoutHooks();
  handleSearch();
}

document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth();
  if (!auth || !auth.id) {
    showToast('Please sign in to continue.', { type: 'info' });
    window.location.replace('/index.html');
    return;
  }
  wireDashboard();
});