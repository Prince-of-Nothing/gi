import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function environment is incomplete." }, 500);
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Invalid session." }, 401);
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profile?.role !== "admin") return json({ error: "Administrator access required." }, 403);

    const { opportunity_id } = await req.json();
    if (typeof opportunity_id !== "string" || !opportunity_id) return json({ error: "opportunity_id is required." }, 400);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    const siteUrlValue = Deno.env.get("GIDIREADS_SITE_URL");
    if (!resendKey || !from || !/@/.test(from) || !siteUrlValue || !/^https:\/\//i.test(siteUrlValue)) return json({ setup_required: true, message: "Configure RESEND_API_KEY, RESEND_FROM_EMAIL on a verified sender domain, and GIDIREADS_SITE_URL." });

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: opportunity, error: opportunityError } = await service.from("platform_opportunities").select("id,title,settings").eq("id", opportunity_id).maybeSingle();
    if (opportunityError || !opportunity) return json({ error: "Opportunity not found." }, 404);
    if (opportunity.settings?.results_published !== true) return json({ error: "Official results have not been published." }, 409);

    const { data: result, error: resultError } = await service.from("holiday_hearts_results").select("entry_id,placement,rank,confirmed").eq("opportunity_id", opportunity_id).eq("placement", "winner").eq("confirmed", true).maybeSingle();
    if (resultError || !result) return json({ error: "No confirmed first-place winner was found." }, 404);
    const { data: entry, error: entryError } = await service.from("holiday_hearts_entries").select("id,author_id,title,story_id").eq("id", result.entry_id).maybeSingle();
    if (entryError || !entry) return json({ error: "Winner entry not found." }, 404);
    const { data: authUser, error: userError } = await service.auth.admin.getUserById(entry.author_id);
    const recipient = authUser?.user?.email;
    if (userError || !recipient) return json({ error: "The winner account does not have a deliverable email address." }, 409);

    const deliveryKey = { opportunity_id, recipient_user_id: entry.author_id, email_type: "winner" };
    const { data: existing } = await service.from("holiday_hearts_email_deliveries").select("id,status").match(deliveryKey).maybeSingle();
    if (existing?.status === "sent" || existing?.status === "sending") return json({ skipped: true, reason: "This winner email has already been sent or is being processed." });
    let deliveryId = existing?.id;
    if (deliveryId) {
      await service.from("holiday_hearts_email_deliveries").update({ status: "sending", error_message: null, updated_at: new Date().toISOString() }).eq("id", deliveryId);
    } else {
      const { data: created, error: createError } = await service.from("holiday_hearts_email_deliveries").insert({ ...deliveryKey, status: "sending" }).select("id").single();
      if (createError || !created) {
        const { data: raced } = await service.from("holiday_hearts_email_deliveries").select("status").match(deliveryKey).maybeSingle();
        if (raced?.status === "sent" || raced?.status === "sending") return json({ skipped: true, reason: "This winner email has already been sent or is being processed." });
        return json({ error: "Could not create the email delivery record." }, 500);
      }
      deliveryId = created.id;
    }

    const siteUrl = siteUrlValue.replace(/\/$/, "");
    const storyUrl = entry.story_id ? `${siteUrl}/story.html?id=${encodeURIComponent(entry.story_id)}` : `${siteUrl}/holiday-hearts.html#results`;
    const title = escapeHtml(entry.title || "your story");
    const html = `<div style="margin:0;padding:36px 16px;background:#100a16;color:#f5edf8;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:32px;border:1px solid #493453;border-radius:18px;background:#1a1021"><p style="color:#c5a4ef;letter-spacing:3px;font-size:12px">GIDIREADS · HOLIDAY HEARTS 2026</p><h1 style="font-family:Georgia,serif;font-size:32px">You are our winner.</h1><p>Congratulations. <strong>${title}</strong> has been confirmed as the first-place winner of Holiday Hearts.</p><p>The GidiReads team will contact you about the next steps and the contract offer. The contest result does not itself create an exclusive contract.</p><p style="margin:28px 0"><a href="${storyUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#c5a4ef;color:#1b1022;text-decoration:none;font-weight:bold">View the results</a></p><p style="color:#b9aabd;font-size:13px">Thank you for sharing your work with GidiReads.</p></div></div>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: "You won Holiday Hearts 2026 — GidiReads", html }),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      await service.from("holiday_hearts_email_deliveries").update({ status: "failed", error_message: String(responseBody?.message || response.statusText).slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", deliveryId);
      return json({ error: "Resend could not deliver the winner email. Check the Resend logs and sender-domain setup." }, 502);
    }
    await service.from("holiday_hearts_email_deliveries").update({ status: "sent", provider_message_id: responseBody?.id || null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", deliveryId);
    return json({ sent: true, recipient_label: recipient.replace(/^(.).+(@.*)$/, "$1•••$2") });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected email delivery error." }, 500);
  }
});
