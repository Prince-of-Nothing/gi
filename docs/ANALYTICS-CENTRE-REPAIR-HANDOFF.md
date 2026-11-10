GIDIREADS — ANALYTICS CENTRE + CONTRACT OFFER POLISH

Changed files
- analytics.html
- analytics.js
- analytics.css
- contract-center.js
- creator-economy.css

Analytics implementation
- Story selector shows stories owned by the signed-in author with an active, accepted or signed contract.
- Changing the story or period reloads story-scoped metrics.
- Secure RPC: public.author_story_analytics(uuid, integer).
- Metrics: story opens, chapter opens, qualifying effective reads, chapter comments, reviews and average rating, review category averages, Echo totals and unique Echo senders, chapter performance, top chapter, author-level followers and gifts.
- Non-exclusive and exclusive contracts see locked-chapter subscribers. Echo-only contracts do not.
- Period metrics include comparison with the previous equal-length period. All-time totals are compared without a previous-period percentage; the all-time trend chart is capped to the latest 12 months.
- Geography is intentionally marked unavailable because the current production schema has no verified, consent-based country field.
- Purchased Echoes are not assigned to a novel because the wallet records do not provide a verified story attribution. Gifts and followers are reported at author level, not falsely assigned to the selected story.
- Drop-off is not presented until progress data can support a reliable calculation.
- Dark and light theme controls use the existing gidireads-theme preference.

Security
- The analytics RPC is SECURITY DEFINER but checks auth.uid(), stories.author_id, an allowed contract status and contract dates before returning aggregate data.
- No reader-level rows or identifiers are returned.
- EXECUTE is revoked from PUBLIC and anon and granted to authenticated only.
- Production permission check: anon=false, authenticated=true.

Contract offer polish
- When an offer is issued, the panel begins with “YOUR CONTRACT HAS BEEN APPROVED🎉” and a plain-language explanation.
- Accept and Reject actions are visually distinct and use secure RPCs.
- Added public.decline_contract_offer(uuid), which only lets the signed-in author decline their own offer_issued application. It records declined status and sends an in-app notification.
- Existing signed agreements and contract terms were not edited.

Production migrations applied
- author_story_analytics_secure_aggregates
- author_story_analytics_series_and_scope_fix
- author_story_analytics_period_comparison
- author_decline_contract_offer

Verification
- Auth-scoped analytics RPC was executed in a controlled SQL test context for the existing Hacking The Devil contract. It returned real story metrics and chapter-level rows.
- RPC permissions verified: anon cannot execute; authenticated can.
- JavaScript syntax checks passed for analytics.js and contract-center.js.
- HTML parser checks passed for analytics.html and contract-center.html.
- No Vercel deployment was performed. Authenticated mobile browser testing in the live site remains to be done.
