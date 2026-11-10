const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export const DUPLICATE_SIGNUP_MESSAGE = 'We could not create a new account with those details. If you already have a GidiReads account, log in or use Forgot password.';

export function validateSignupDetails(username, email, password) {
  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw new Error('Username must be 3–24 characters using letters, numbers, or underscores.');
  }
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (cleanPassword.length < 8) {
    throw new Error('Your password must be at least 8 characters.');
  }

  return { username: cleanUsername, email: cleanEmail, password: cleanPassword };
}

export async function checkUsernameAvailability(supabase, username) {
  const pattern = String(username).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', pattern)
    .limit(1);

  if (error) {
    console.warn('[GidiReads] Username availability check failed:', error);
    throw new Error('We could not check that username right now. Check your connection and try again.');
  }
  if (data?.length) throw new Error('That username is already taken.');
}

export async function signUpWithUsername(supabase, { username, email, password, options = {} }) {
  const details = validateSignupDetails(username, email, password);
  await checkUsernameAvailability(supabase, details.username);

  const { data, error } = await supabase.auth.signUp({
    email: details.email,
    password: details.password,
    options: {
      ...options,
      data: { ...(options.data || {}), username: details.username },
    },
  });

  if (error) {
    const message = String(error.message || '');
    if (/profiles_username_(lower_)?key|duplicate key.*username|username.*already exists/i.test(message)) {
      throw new Error('That username is no longer available. Please choose another.');
    }
    if (/already registered|already exists|duplicate.*email|email.*already/i.test(message)) {
      throw new Error(DUPLICATE_SIGNUP_MESSAGE);
    }
    throw error;
  }

  // Supabase intentionally returns an empty identities array for some duplicate
  // signup attempts. Keep the response generic so the UI does not expose whether
  // a particular email address already belongs to an account.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error(DUPLICATE_SIGNUP_MESSAGE);
  }

  return data;
}
