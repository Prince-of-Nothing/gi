import { supabase } from './supabaseClient.js';

const loading = document.getElementById('loading');
const resetCard = document.getElementById('resetCard');
const successCard = document.getElementById('successCard');
const invalidCard = document.getElementById('invalidCard');
const form = document.getElementById('resetForm');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function message(text, type='error') {
  formMsg.textContent = text;
  formMsg.className = `msg ${type}`;
}
function showInvalid() { hide(loading); hide(resetCard); hide(successCard); show(invalidCard); }

async function getRecoverySession() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  if (hash.get('error') || query.get('error')) return null;

  // Only a link that carries recovery tokens counts. An old logged-in session must not be reused.
  const hasToken = hash.get('type') === 'recovery' || hash.has('access_token') || query.has('code');
  if (!hasToken) return null;
  let { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  await new Promise(resolve => setTimeout(resolve, 900));
  ({ data: { session } } = await supabase.auth.getSession());
  return session;
}

async function init() {
  try {
    const session = await getRecoverySession();
    if (!session) return showInvalid();
    hide(loading); show(resetCard);
  } catch (error) {
    console.error('Recovery session error:', error);
    showInvalid();
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  hide(formMsg);
  if (password.length < 8) { message('Your password must be at least 8 characters.'); show(formMsg); return; }
  if (password !== confirm) { message('The passwords do not match.'); show(formMsg); return; }
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating…';
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await supabase.auth.signOut();
    hide(resetCard); show(successCard);
  } catch (error) {
    console.error('Password update error:', error);
    message(error.message || 'We could not update your password. Please request a new recovery link and try again.');
    show(formMsg);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update password';
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) { hide(loading); show(resetCard); }
});

init();
