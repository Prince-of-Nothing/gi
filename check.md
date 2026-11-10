# GidiReads — Manual test checklist

Use this checklist to verify the site is working before a release. Test on a local dev server (e.g. `http://localhost:3000`) and, where possible, on a real mobile device. Mark each item only after it has been verified manually.

## 0. Prerequisites
- [ ] Dev server running (`npm run dev` / `vercel dev` / docker nginx on `localhost:3000`)
- [ ] Supabase client configured in `js/supabaseClient.js` (production URL + publishable key; no `service_role` key in client code)
- [ ] Required database objects applied: `gidireads_novel_rankings` / `gidireads_homepage_shelf` RPCs (homepage discovery shelves and rankings ordering), plus `reading_lists.cover_url` and the public `covers` storage bucket for reading-list covers (see `supabase/migrations/20261110000001_reading_list_covers.sql`).
- [ ] Browser console open; no uncaught errors on page load
- [ ] `check.md` updated whenever functionality changes

## 1. Theme changer (nav bar + header)
The site theme (Dark / Beige / Green Beige / Bluish Beige / AMOLED / Custom) is driven by CSS custom properties in `css/theme.css`, so a single variable (`--nav-surface`, `--nav-text`, `--nav-accent`, `--page-bg`, `--surface`, ...) covers the nav bar, header, and every surface. Themes that share a value reuse the same variable — no duplicate per-theme fields.

- [ ] Opening the theme switcher (Settings, footer theme toggle, or any `data-theme-toggle` control) changes the page colours without a reload.
- [ ] The **nav bar / site header** on every themed page recolours with the selected theme (background, text, active link, badge).
- [ ] The bottom navigation bar recolours with the theme.
- [ ] Selecting a theme whose values match another theme produces identical colours (shared CSS variable, not duplicated fields).
- [ ] Custom theme (JSON vars) applies and persists.
- [ ] Theme choice survives refresh and persists across pages (`localStorage` `gidireads-theme`, plus `profiles.theme_pref` when signed in via `theme-sync.js`).

### Pages that must share one header and theme correctly
- [ ] `index.html` (home — reference "sexy" header)
- [ ] `collection.html`
- [ ] `chapter-pricing.html`
- [ ] `moderator.html`
- [ ] `library.html`
- [ ] `terms.html`
- [ ] `story.html`
- [ ] `reading-list.html`
- [ ] `people.html`
- [ ] `notifications.html`
- [ ] `my-gidireads.html`
- [ ] `holiday-hearts-entry.html`
- [ ] `holiday-hearts.html`
- [ ] `explore.html`
- [ ] `creator-earnings.html`
- [ ] `author.html`
- [ ] `account.html`
- [ ] Each header above shows the same primary navigation (Home, Explore, Rankings, Library, The Gathering) and the same actions (Rankings, Notifications, Profile, Log in), with the current page highlighted.

## 2. Removed information pages
The following pages and their links were removed: `contact.html`, `privacy.html`, `help.html`, `resources.html`, `reader-resources.html`.

- [ ] `contact.html`, `privacy.html`, `help.html`, `resources.html`, `reader-resources.html` no longer exist.
- [ ] No remaining page or footer links to any of them (check `js/site-footer.js`, `terms.html`, `authors-studio.html`, `create-story.html`, `my-stories.html`, `story-workspace.html`).
- [ ] `test.js` and `audit-site-browser.js` no longer list the removed pages.
- [ ] Footer still links to Terms (and other live pages); no 404 links remain in the footer.

## 3. Story discovery & linking (explore / index home)
- [ ] Tapping a story card on the home page (`index.html`) opens `story.html?id=<storyId>` with the correct story id in the URL.
- [ ] Tapping a story card on Explore (`explore.html`) opens `story.html?id=<storyId>` with the correct story id.
- [ ] Tapping a story in a collection (`collection.html`), rankings, author profile, reading list, holiday rail, or "related stories" opens `story.html?id=<storyId>`.
- [ ] `story.html` opened without `?id=` shows a clear "No story specified" message rather than a blank/broken page.
- [ ] Story page loads the title, cover, author, synopsis, genres/tags, stats, latest chapters, and "Start Reading" button.
- [ ] "Start Reading" opens `reader.html?story=<id>&chapter=<n>`.

## 4. Story page (`story.html`)
- [ ] Story details load (title, author, synopsis, status, reads, echoes, chapters, word count).
- [ ] Cover image displays (or placeholder when no cover).
- [ ] "Add to Library" works for signed-in users and updates the button state.
- [ ] Share / Report story work.
- [ ] Reader reviews load; adding/editing/deleting a review works when signed in.
- [ ] "View all chapters" toggles the full chapter list; chapter links open `reader.html?story=<id>&chapter=<n>`.

## 5. Reading page (`reader.html`) — previously reported as not working
- [ ] Opening a chapter from a story page or library loads the manuscript (`reader.html?story=<id>&chapter=<n>`).
- [ ] Chapter title, author, and reading time display.
- [ ] Previous / Next chapter navigation works at chapter end.
- [ ] Reader drawer opens: appearance themes, font/size/line/width, flow (scroll/pages), story page link, library add, Echo, offline save.
- [ ] Scroll progress bar and chip update; position is saved/resumed.
- [ ] Bookmark, Echo, comment, and share chapter work when signed in.
- [ ] "Return to GidiReads" on the error state works.
- [ ] Offline mode shows a saved bundle when a story was previously cached; online errors show a clear message.

## 6. Library (`library.html`)
- [ ] Signed-in users see Continue Reading, Bookmarked, My Shelf (saved), and Completed sections.
- [ ] Tapping a shelf story opens the story page (`story.html?id=`) or the reader (if currently reading).
- [ ] Long-pressing a novel in the library shows selection boxes; selected novels can be **removed from the library** (delete).
- [ ] The story menu (⋯) offers Continue Reading, Story Info, Share, Offline, Remove from Library.
- [ ] Reading lists: "My Lists" section loads; creating a list works.
- [ ] Reading list cover upload: a cover image can be selected/uploaded for a reading list and is saved/displayed.
- [ ] "Add to list" sheet on a story page lists existing lists and lets the user create a new one.

## 7. Authentication & account
- [ ] Log in / sign up work; log out works.
- [ ] Profile editing (username, display name, bio, avatar, header) works; preview updates before save.
- [ ] Account page theme/font settings persist.

## 8. Navigation
- [ ] Bottom navigation (Home, Explore, Library, Write, Alerts) works and highlights the current section.
- [ ] Header links (Home, Explore, Rankings, Library, The Gathering, Notifications, Profile) navigate correctly.
- [ ] "See all" links on home shelves open the matching `collection.html` view.
- [ ] Admin link shows only for admins.

## 9. Pages that must load without console errors
- [ ] Every page in `test.js` / `audit-site-browser.js` loads with no uncaught JavaScript errors and no 404 network requests.

## Sign-off
Tester: ____________________  Date: ____________________  Build/version: ____________________

All critical items checked ☐ → site is considered working.
