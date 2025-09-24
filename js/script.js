const LOGIN_ENDPOINT = '/LAMPAPI/login.php';
const REGISTER_ENDPOINT = '/LAMPAPI/register.php';
const LOGIN_SUCCESS_REDIRECT = '/pages/dashboard.html';
const REGISTER_SUCCESS_REDIRECT = '/pages/login.html';

const AUTH_KEY = 'cm_auth';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  let data = null;
  try { data = await res.json(); } catch (_) {}

  return { ok: res.ok, status: res.status, data };
}

function setMessage(el, text, kind = 'info') {
  if (!el) return;
  el.textContent = text || '';
  el.dataset.state = kind;
}

function togglePasswordVisibility(input, btn, img) {
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.setAttribute('aria-pressed', String(!isText));
  if (img) img.src = isText ? '/images/eye-closed.svg' : '/images/eye-open.svg';
}

function initEyeToggles(root = document) {
  const fields = root.querySelectorAll('input[data-eye-toggle="true"]');
  fields.forEach(input => {
    const wrapper = input.closest('.input-wrap') || input.parentElement;
    const btn = wrapper?.querySelector('.eye-toggle');
    const img = btn?.querySelector('img');
    if (!btn) return;

    const updateBtnVisibility = () => { btn.style.display = input.value ? '' : 'none'; };
    updateBtnVisibility();
    input.addEventListener('input', updateBtnVisibility);

    btn.addEventListener('click', () => togglePasswordVisibility(input, btn, img));
  });
}

function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}
function isLoggedIn() {
  const a = getAuth();
  return !!(a && a.loggedIn === true);
}
function setLoggedIn(payload) {
  try {
    const rec = {
      loggedIn: true,
      id: payload?.id ?? null,
      email: payload?.email ?? null,
      username: payload?.username ?? null,
      at: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(rec));
  } catch {}
}
function performLogout() {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.clear();
  } catch {}
}

function ensureToastRoot(){
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    root.setAttribute('aria-live','assertive');
    root.setAttribute('role','region');
    document.body.appendChild(root);
  }
  return root;
}

let _toastLastText = '';
let _toastLastAt = 0;

function showToast(message, opts = {}){
  const type = opts.type || 'error';
  const duration = Number.isFinite(opts.duration) ? opts.duration : 5000;
  const root = ensureToastRoot();

  const dismiss = (node) => {
    if (!node || node._closing) return;
    node._closing = true;
    node.classList.remove('is-in');
    node.classList.add('is-out');
    setTimeout(()=>node.remove(), 200);
  };

  const existing = root.querySelector('.toast');
  if (existing) {
    existing.querySelector('.toast__text').textContent = message;
    existing.className = 'toast toast--' + type + ' is-in';
    const iconEl = existing.querySelector('.toast__icon');
    if (iconEl) iconEl.setAttribute('data-icon', type === 'error' ? 'warning' : 'info');
    clearTimeout(existing._timer);
    existing._timer = setTimeout(()=>dismiss(existing), duration);
    return;
  }

  const el = document.createElement('div');
  el.className = 'toast toast--' + type + ' is-in';
  el.setAttribute('role','alert');
  el.innerHTML = '<span class="toast__icon" aria-hidden="true" data-icon="' + (type === 'error' ? 'warning' : 'info') + '"></span><span class="toast__text"></span><button class="toast__close" type="button" aria-label="Close">×</button>';
  el.querySelector('.toast__text').textContent = message;

  el._timer = setTimeout(()=>dismiss(el), duration);
  el.addEventListener('click', (e)=>{
    if (e.target.classList.contains('toast__close') || e.currentTarget === e.target) dismiss(el);
  });
  document.addEventListener('keydown', function onKey(ev){
    if (ev.key === 'Escape') { dismiss(el); document.removeEventListener('keydown', onKey); }
  });

  root.appendChild(el);
}

function setPointerClass() {
  const coarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
  document.documentElement.classList.toggle('is-coarse', !!coarse);
}
function watchPointerChanges() {
  const mqs = ['(pointer: coarse)', '(hover: none)'].map(q => window.matchMedia(q));
  mqs.forEach(mq => mq.addEventListener?.('change', setPointerClass));
}

function initCaretOverlay() {
  if (document.documentElement.classList.contains('is-coarse')) return;

  const selectors = ['#searchInput', '#username', '#password', '#reg-username', '#reg-email', '#reg-password'];
  const inputs = selectors.map(s => document.querySelector(s)).filter(Boolean);
  if (!inputs.length) return;

  let caretEl = null;
  let active = null;

  const BLINK_CLASS = 'is-blinking';
  const IDLE_DELAY_MS = 320;

  let idleTimer = null;
  let last = { input: null, index: -1, x: -1, y: -1 };

  const ensureCaretEl = () => {
    if (!caretEl) {
      caretEl = document.createElement('div');
      caretEl.className = 'caret-overlay';
      caretEl.style.opacity = '1';
      document.body.appendChild(caretEl);
    }
  };

  const clearIdle = () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  };

  const onActivity = () => {
    if (!caretEl) return;
    clearIdle();
    caretEl.classList.remove(BLINK_CLASS);
    caretEl.style.opacity = '1';
    idleTimer = setTimeout(() => {
      caretEl.classList.add(BLINK_CLASS);
    }, IDLE_DELAY_MS);
  };

  const num = v => (parseFloat(v) || 0);

  const measurer = (() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return {
      width(text, style, isPassword) {
        const str = isPassword ? '•'.repeat(text.length) : text;
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.font = font;
        const metrics = ctx.measureText(str);
        const ls = parseFloat(style.letterSpacing) || 0;
        return metrics.width + (ls > 0 ? ls * str.length : 0);
      }
    };
  })();

  function updateCaret() {
    if (!active || !caretEl) return;

    const selStart = active.selectionStart ?? 0;
    const selEnd   = active.selectionEnd ?? selStart;

    if (selStart !== selEnd) {
      caretEl.style.display = 'none';
      clearIdle();
      return;
    }

    const style = getComputedStyle(active);
    const rect = active.getBoundingClientRect();

    const padL = num(style.paddingLeft);
    const bL = num(style.borderLeftWidth);
    const bT = num(style.borderTopWidth);
    const bB = num(style.borderBottomWidth);

    const contentLeft = rect.left + window.scrollX + bL + padL;

    const before = (active.value || '').slice(0, selStart);
    const isPassword = active.type === 'password';
    const textWidth = measurer.width(before, style, isPassword);

    const x = Math.round(contentLeft - active.scrollLeft + textWidth);

    const fs = parseFloat(style.fontSize) || 16;
    const lhParsed = parseFloat(style.lineHeight);
    const lineHeight = Number.isFinite(lhParsed) && lhParsed > 0 ? lhParsed : fs * 1.3;
    const caretHeight = Math.max(12, Math.round(Math.min(lineHeight, active.clientHeight - bT - bB)));

    const contentTop = rect.top + window.scrollY + bT;
    const y = Math.round(contentTop + (active.clientHeight - bT - bB - caretHeight) / 2) + 1;

    caretEl.style.display = 'block';
    caretEl.style.left = `${x}px`;
    caretEl.style.top = `${y}px`;
    caretEl.style.height = `${caretHeight}px`;

    if (last.input !== active || last.index !== selStart || last.x !== x || last.y !== y) {
      onActivity();
      last = { input: active, index: selStart, x, y };
    }
  }

  function showCaret(e) {
    active = e.currentTarget;
    ensureCaretEl();
    last = { input: null, index: -1, x: -1, y: -1 };
    onActivity();
    updateCaret();
  }
  function hideCaret() {
    if (caretEl) {
      caretEl.style.display = 'none';
      caretEl.classList.remove(BLINK_CLASS);
    }
    clearIdle();
    active = null;
  }

  function wireActivity(el, evt, opts) {
    el.addEventListener(evt, () => { onActivity(); updateCaret(); }, opts);
  }

  inputs.forEach(i => {
    wireActivity(i, 'beforeinput', { passive: true });
    wireActivity(i, 'input', { passive: true });
    wireActivity(i, 'compositionstart', { passive: true });
    wireActivity(i, 'compositionupdate', { passive: true });
    wireActivity(i, 'compositionend', { passive: true });

    wireActivity(i, 'keydown', { passive: true });
    wireActivity(i, 'keyup', { passive: true });

    wireActivity(i, 'mousedown', { passive: true });
    wireActivity(i, 'mouseup', { passive: true });
    wireActivity(i, 'click', { passive: true });

    wireActivity(i, 'scroll', { passive: true });

    i.addEventListener('focus', showCaret);
    i.addEventListener('blur', hideCaret);
  });

  window.addEventListener('resize', () => { onActivity(); updateCaret(); });
  document.addEventListener('selectionchange', () => {
    if (active && document.activeElement === active) {
      onActivity();
      updateCaret();
    }
  });
}

function initLogoutHooks(root = document) {
  const logoutLinks = root.querySelectorAll('a[data-logout="true"]');
  logoutLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      performLogout();
      window.location.assign(a.href);
    });
  });
}

function showSignedOutMessageIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('logout') === '1') {
    const msg = document.getElementById('loginMessage') || document.getElementById('registerMessage');
    if (msg) setMessage(msg, '');
    showToast('You’ve been signed out.', { type: 'info' });
  }
}

function initBrandLinkRouting(root = document) {
  const brand = root.querySelector('.brand-link');
  if (!brand) return;

  brand.addEventListener('click', (e) => {
    if (isLoggedIn()) return;
    e.preventDefault();
    window.location.assign('/pages/login.html');
  });
}

function renderNavbarRight(root = document) {
  const container = root.querySelector('.nav-right');
  if (!container) return;

  container.innerHTML = '';

  if (isLoggedIn()) {
    const auth = getAuth();
    const uname = auth?.username || '';
    const wrap = document.createElement('div');
    wrap.className = 'header-right';

    const who = document.createElement('span');
    who.className = 'user-name';
    who.id = 'navUsername';
    who.textContent = uname;

    const signout = document.createElement('a');
    signout.href = '/pages/login.html?logout=1';
    signout.className = 'signout-link';
    signout.setAttribute('data-logout', 'true');
    signout.textContent = 'Sign out';

    wrap.appendChild(who);
    wrap.appendChild(signout);
    container.appendChild(wrap);
    initLogoutHooks(root);
  }
}

function renderHome(root = document){
  const outBlock = root.getElementById('homeActionsLoggedOut');
  const inBlock  = root.getElementById('homeActionsLoggedIn');
  const nameSlot = root.getElementById('homeUsername');

  if (!outBlock || !inBlock) return; // not the home page; bail

  if (isLoggedIn()){
    const auth = getAuth();
    if (nameSlot) nameSlot.textContent = auth?.username || '';
    inBlock.hidden = false;
    outBlock.hidden = true;
  } else {
    if (nameSlot) nameSlot.textContent = '';
    inBlock.hidden = true;
    outBlock.hidden = false;
  }
}

function renderLandingIfPresent(root = document) {
  const msg = root.getElementById('landingMessage');
  const actions = root.getElementById('landingActions');
  if (!msg || !actions) return;

  actions.innerHTML = '';

  if (isLoggedIn()) {
    const auth = getAuth();
    const uname = auth?.username || 'friend';
    setMessage(msg, `Welcome, ${uname}.`, 'success');
    actions.innerHTML = `
      <a href="/pages/login.html?logout=1" data-logout="true">Sign in again</a>
      or
      <a href="/pages/register.html?logout=1" data-logout="true">create another account</a>.
    `;
    initLogoutHooks(root);
  } else {
    setMessage(msg, 'You are not signed in.', 'info');
    actions.innerHTML = `
      <a href="/pages/login.html">Sign in</a>
      or
      <a href="/pages/register.html">create an account</a>.
    `;
  }
}

function wireLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const msgEl = document.getElementById('loginMessage');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMessage(msgEl, '');

    const username = (usernameEl.value || '').trim();
    const password = passwordEl.value || '';

    if (!username || !password) {
      setMessage(msgEl, '');
	  showToast('Please enter your username and password.', { type: 'error' });
      return;
    }

    submitBtn.disabled = true;
    setMessage(msgEl, 'Signing in…', 'info');

    try {
      const { ok, status, data } = await postJson(LOGIN_ENDPOINT, { username, password });

	if (ok && data && data.id > 0 && data.error === '') {
        setLoggedIn({ id: data.id, email: data.email, username: data.username });
        setMessage(msgEl, 'Signed in successfully.', 'success');
        window.location.assign(LOGIN_SUCCESS_REDIRECT);
        return;
      }

      const serverMsg = (data && data.error) ? data.error : (status === 400 ? 'Invalid username or password.' : 'Unable to sign in.');
      setMessage(msgEl, '');
	  showToast(serverMsg, { type: 'error' });
    } catch (err) {
      setMessage(msgEl, '');
	  showToast('Network error. Please try again.', { type: 'error' });
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function wireRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const usernameEl = document.getElementById('reg-username');
  const emailEl = document.getElementById('reg-email');
  const passwordEl = document.getElementById('reg-password');
  const msgEl = document.getElementById('registerMessage');
  const submitBtn = form.querySelector('button[type="submit"]');

  const basicEmailOK = (s) => /^\S+@\S+\.\S+$/.test(s);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMessage(msgEl, '');

    const username = (usernameEl.value || '').trim();
    const email = (emailEl.value || '').trim();
    const password = passwordEl.value || '';
	
	if (!username || !email || !password) {
	  setMessage(msgEl, '');
	  showToast('Please fill in username, email, and password.', { type: 'error' });
	  return;
	}
    if (!basicEmailOK(email)) {
      setMessage(msgEl, '');
	  showToast('Please enter a valid email address.', { type: 'error' });
      return;
    }

    submitBtn.disabled = true;
    setMessage(msgEl, 'Creating your account…', 'info');

    try {
      const { ok, data } = await postJson(REGISTER_ENDPOINT, { username, password, email });

      if (ok && data && data.error === '') {
        setMessage(msgEl, 'Account created. Signing you in…', 'info');

        const loginRes = await postJson(LOGIN_ENDPOINT, { username, password });
		if (loginRes.ok && loginRes.data && loginRes.data.id > 0 && loginRes.data.error === '') {
          setLoggedIn({ id: loginRes.data.id, email: loginRes.data.email, username: loginRes.data.username });
          window.location.assign(LOGIN_SUCCESS_REDIRECT);
          return;
        }

        setMessage(msgEl, 'Account created. Please sign in.', 'success');
        window.location.assign(REGISTER_SUCCESS_REDIRECT);
        return;
      }

      const serverMsg = (data && data.error) ? data.error : 'Unable to create account.';
      setMessage(msgEl, '');
	  showToast(serverMsg, { type: 'error' });
    } catch (err) {
      setMessage(msgEl, '');
	  showToast('Network error. Please try again.', { type: 'error' });
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setPointerClass();
  watchPointerChanges();

  wireLoginForm();
  wireRegisterForm();

  initEyeToggles();
  initCaretOverlay();
  initBrandLinkRouting();
  renderNavbarRight();
  renderHome();
  initLogoutHooks();
  showSignedOutMessageIfNeeded();
});