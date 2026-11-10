// audit-site-browser.js
// Run this inside OpenCode code mode (execute tool) to screenshot + scrape every page.
// It opens each page, waits for load, collects console errors + network 404s, takes a screenshot,
// and scrapes the page's title + visible text count, writing a JSON report to the server.
//
// Usage (in code mode):
//   const code = fs.readFileSync('audit-site-browser.js','utf8'); eval(code);
//
// Prerequisite: dev server running on http://localhost:3000

const pages = [
  "index.html","welcome.html","explore.html","library.html","community.html",
  "account.html","admin.html","ae.html","analytics.html","author.html","authors-studio.html",
  "chapter-editor.html","chapter-pricing.html","collection.html","community-space.html",
  "contract-center.html","create-story.html","creator-earnings.html",
  "holiday-hearts.html","moderator.html","my-gidireads.html","my-stories.html",
  "notifications.html","opportunities.html","opportunity.html","people.html",
  "reader.html","reading-list.html","reset-password.html",
  "settings.html","store.html","story.html","story-bible.html",
  "story-metadata.html","story-publishing.html","story-workspace.html","terms.html",
  "auth.html","ae-apply.html","ae-author-feedback.html","ae-draft-review.html",
  "ae-review.html","author-notes.html","holiday-hearts-entry.html"
];

const results = [];
for (const p of pages) {
  const tab = await tools.browser.tabs.open({ url: "http://localhost:3000/" + p });
  await tools.browser.wait({ tabID: tab.id, condition: "load" });
  const ce = await tools.browser.console({ tabID: tab.id, level: "error" });
  const reqs = await tools.browser.network.list({ tabID: tab.id });
  const bad = reqs.requests.filter(r => (r.status && r.status >= 400) || r.failed);
  await tools.browser.tabs.focus({ tabID: tab.id });
  let shotPath = null;
  try { const s = await tools.browser.screenshot({ tabID: tab.id }); shotPath = s.path; } catch (e) { shotPath = "screenshot-failed: " + e.message; }
  const snap = await tools.browser.snapshot({ tabID: tab.id });
  results.push({
    page: p,
    consoleErrors: ce.messages.map(m => m.text),
    networkFailures: bad.map(r => r.url + " (" + (r.status || "failed") + ")"),
    screenshot: shotPath,
    title: (snap.content.match(/"([^"]+)"/) || [])[1] || "",
    textNodes: (snap.content.match(/StaticText/g) || []).length
  });
  await tools.browser.tabs.close({ tabID: tab.id });
}
// write report via server-side? Browser can't write files. Log instead.
console.log(JSON.stringify(results, null, 2));
return results;
