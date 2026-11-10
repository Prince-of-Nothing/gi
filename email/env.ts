// Tiny runtime-agnostic env reader: works in Next.js (Node), Vercel Edge and Supabase Edge Functions (Deno).
export function env(name: string): string | undefined {
  const g = globalThis as any;
  const v = g.Deno?.env?.get?.(name) ?? g.process?.env?.[name];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
