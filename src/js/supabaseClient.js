import { createClient } from '@supabase/supabase-js';

/*
 * GidiReads environment selection.
 * Production is the default, including Acode Preview.
 * Padres development is selected only with the explicit ?env=dev query parameter.
 * Never place a service_role/secret key in this browser file.
 */
const PROJECTS = {
  production: {
    label: 'GidiReads production',
    url: 'https://mbikuyuhcttkcqpgiihr.supabase.co',
    key: 'sb_publishable_0Z2sgGgw8f9RqCwxxJNCbw_mUrMQXfE'
  },
  dev: {
    label: 'Padres development',
    url: 'https://uyrsljueizptkgeqrawu.supabase.co',
    key: 'sb_publishable_pEzwyKfAhZpjpLurJ7Mv4w_wI2FpaBE'
  }
};

function resolveEnvironment() {
  try {
    // Production is the default, including Acode Preview.
    // Use ?env=dev only when intentionally testing against Padres.
    const params = new URLSearchParams(window.location.search || '');
    return params.get('env') === 'dev' ? 'dev' : 'production';
  } catch (_) {
    // Fail closed to the intended GidiReads project if URL parsing fails.
    return 'production';
  }
}

export const supabaseEnvironment = resolveEnvironment();
export const supabaseProjectName = PROJECTS[supabaseEnvironment].label;
export const supabase = createClient(PROJECTS[supabaseEnvironment].url, PROJECTS[supabaseEnvironment].key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

console.info(`[GidiReads] Supabase environment: ${supabaseProjectName}`);
