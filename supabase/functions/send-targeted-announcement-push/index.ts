import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublic = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("WEB_PUSH_VAPID_SUBJECT") || req.headers.get("origin");
    if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function environment is incomplete." }, 500);
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session." }, 401);
    const { data: profile, error: profileError } = await userClient.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return json({ error: "Administrator access required." }, 403);
    const { announcement_id } = await req.json();
    if (!announcement_id || typeof announcement_id !== "string") return json({ error: "announcement_id is required." }, 400);
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: announcement, error: announcementError } = await service.from("platform_announcements").select("id,title,message,audience,category,priority,status,link_url,opportunity_id,publish_at,expires_at").eq("id", announcement_id).maybeSingle();
    if (announcementError || !announcement) return json({ error: "Announcement not found." }, 404);
    if (announcement.status !== "published") return json({ error: "Only published announcements can trigger push." }, 400);
    if (announcement.publish_at && new Date(announcement.publish_at).getTime() > Date.now()) return json({ sent: 0, skipped: true, reason: "Announcement is scheduled for a future time." });
    if (announcement.expires_at && new Date(announcement.expires_at).getTime() <= Date.now()) return json({ sent: 0, skipped: true, reason: "Announcement has expired." });
    if (!vapidPublic || !vapidPrivate || !vapidSubject || !/^https:\/\//i.test(vapidSubject)) return json({ setup_required: true, sent: 0, message: "Configure WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY in Supabase Edge Function Secrets; a production HTTPS origin is required." });
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const { data: subs, error: subsError } = await service.from("push_subscriptions").select("endpoint,user_id,subscription");
    if (subsError) return json({ error: "Could not load push subscriptions." }, 500);
    let targetIds = new Set((subs || []).map((row: any) => row.user_id));
    if (announcement.audience === "authors" || announcement.audience === "readers") {
      const { data: authors, error: authorsError } = await service.from("stories").select("author_id");
      if (authorsError) return json({ error: "Could not determine announcement audience." }, 500);
      const authorIds = new Set((authors || []).map((row: any) => row.author_id));
      targetIds = new Set([...targetIds].filter(id => announcement.audience === "authors" ? authorIds.has(id) : !authorIds.has(id)));
    } else if (announcement.audience === "holiday_participants" || announcement.audience === "holiday_finalists") {
      if (!announcement.opportunity_id) return json({ error: "A related opportunity is required for this audience." }, 400);
      let query = service.from("holiday_hearts_entries").select("author_id").eq("opportunity_id", announcement.opportunity_id).not("status", "in", "(withdrawn,rejected,disqualified)");
      if (announcement.audience === "holiday_finalists") query = query.eq("is_finalist", true).eq("status", "approved");
      const { data: entries, error: entriesError } = await query;
      if (entriesError) return json({ error: "Could not determine the Holiday Hearts audience." }, 500);
      const participantIds = new Set((entries || []).map((row: any) => row.author_id));
      targetIds = new Set([...targetIds].filter(id => participantIds.has(id)));
    }
    const targets = (subs || []).filter((row: any) => targetIds.has(row.user_id));
    const targetUrl = typeof announcement.link_url === "string" && announcement.link_url.trim() ? announcement.link_url.trim() : "/notifications.html";
    let sent = 0; let failed = 0; const stale: string[] = [];
    await Promise.all(targets.map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title: announcement.title, body: announcement.message, url: targetUrl, tag: "gidireads-announcement-" + announcement.id, priority: announcement.priority, category: announcement.category }));
        sent++;
      } catch (error) {
        failed++; const statusCode = (error as any)?.statusCode;
        if (statusCode === 404 || statusCode === 410) stale.push(row.endpoint);
      }
    }));
    if (stale.length) await service.from("push_subscriptions").delete().in("endpoint", stale);
    return json({ sent, failed, removed_expired_subscriptions: stale.length, total_targets: targets.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected push delivery error." }, 500);
  }
});
