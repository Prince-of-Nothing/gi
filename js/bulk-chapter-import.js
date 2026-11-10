import { supabase } from './supabaseClient.js';
import { GOOGLE_DOCS_CLIENT_ID, GOOGLE_PICKER_API_KEY, GOOGLE_CLOUD_PROJECT_NUMBER } from './google-docs-config.js';

const $ = (id) => document.getElementById(id);
const state = { storyId: new URLSearchParams(location.search).get('story'), userId: null, story: null, existing: [], items: [], busy: false, googleTabs: [], googleTokenClient: null, googleAccessToken: null, googlePickerLoaded: false, pendingTabId: null, selectedGoogleFileId: null };
const wordCount = (value = '') => (String(value).trim().match(/\S+/g) || []).length;
const clean = (value = '') => String(value).replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
const norm = (value = '') => clean(value).toLocaleLowerCase().replace(/\s+/g, ' ');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function splitText(source, fileName = '') {
  const text = clean(source);
  if (!text) return [];
  const lines = text.split('\n');
  const heading = /^\s*(?:#{1,3}\s+(.{1,100})|((?:chapter|ch\.?|part)\s+[\w.-]+(?:\s*[:—-].*)?)|(prologue|epilogue|afterword|preface|interlude))\s*$/i;
  const separators = /^\s*(?:-{3,}|\*{3,}|={3,}|\[\[\s*(?:chapter|new chapter)\s*\]\])\s*$/i;
  const result = []; let current = null;
  const start = (title = '') => { current = { title: title.trim(), content: '' }; result.push(current); };
  for (const line of lines) {
    const match = line.match(heading);
    if (match && line.trim().length <= 110) {
      start(match[1] || match[2] || match[3]);
    } else if (separators.test(line)) {
      if (current && current.content.trim()) current = null;
    } else {
      if (!current) start('');
      current.content += line + '\n';
    }
  }
  const parts = result.map((part, index) => ({
    title: clean(part.title) || `Chapter ${index + 1}`,
    content: clean(part.content),
    source: fileName || 'Pasted text',
    include: true,
    duplicate: false,
    duplicateReason: ''
  })).filter((part) => part.content.length > 0);
  return parts;
}

async function loadPdfReader() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gidireads-pdfjs]');
    if (existing) {
      if (window.pdfjsLib) return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('The PDF reader could not load. Check your internet connection, then try again.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.gidireadsPdfjs = 'true';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('The PDF reader could not load. Check your internet connection, then try again.'));
    document.head.appendChild(script);
  });
  if (!window.pdfjsLib) throw new Error('The PDF reader did not start correctly. Please try a DOCX or TXT file instead.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return window.pdfjsLib;
}

async function readPdf(file) {
  const pdfjs = await loadPdfReader();
  let pdf;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const task = pdfjs.getDocument({ data: bytes, useWorkerFetch: true, isEvalSupported: false });
    pdf = await task.promise;
  } catch (error) {
    if (error?.name === 'PasswordException') throw new Error(`${file.name}: this PDF is password-protected. Export an unlocked copy before importing it.`);
    throw new Error(`${file.name}: the PDF could not be opened. It may be damaged, encrypted or unsupported.`);
  }
  if (!pdf.numPages) throw new Error(`${file.name}: this PDF has no readable pages.`);
  if (pdf.numPages > 500) throw new Error(`${file.name}: this PDF has ${pdf.numPages} pages. Split it into files of 500 pages or fewer.`);
  const pages = [];
  let extractedCharacters = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    let page;
    try { page = await pdf.getPage(pageNumber); }
    catch { throw new Error(`${file.name}: page ${pageNumber} could not be read. Export a fresh PDF and try again.`); }
    const content = await page.getTextContent({ includeMarkedContent: false });
    const items = (content.items || []).filter((item) => typeof item.str === 'string' && item.str.trim());
    // PDF text items are positioned individually. Rebuild lines by their vertical
    // coordinates so the result is useful for chapter review instead of a word soup.
    const positioned = items.map((item) => ({
      text: item.str,
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      width: Number(item.width || 0),
      height: Math.abs(Number(item.height || item.transform?.[3] || 10))
    })).sort((a, b) => Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x);
    const lines = [];
    for (const item of positioned) {
      let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2.5, item.height * 0.28));
      if (!line) { line = { y: item.y, height: item.height, parts: [] }; lines.push(line); }
      line.parts.push(item);
    }
    lines.sort((a, b) => b.y - a.y);
    const pageText = lines.map((line) => {
      line.parts.sort((a, b) => a.x - b.x);
      let text = '';
      let previous = null;
      for (const part of line.parts) {
        const gap = previous ? part.x - (previous.x + previous.width) : 0;
        const needsSpace = previous && gap > Math.max(1.5, Math.min(8, part.height * 0.18));
        text += (needsSpace && !/\s$/.test(text) && !/^\s/.test(part.text) ? ' ' : '') + part.text;
        previous = part;
      }
      return text.trim();
    }).filter(Boolean).join('\n');
    extractedCharacters += pageText.replace(/\s/g, '').length;
    if (pageText) pages.push(pageText);
    if (pageNumber % 10 === 0 || pageNumber === pdf.numPages) showMessage(`Reading PDF page ${pageNumber} of ${pdf.numPages}…`);
  }
  if (extractedCharacters === 0) {
    throw new Error(`${file.name}: no selectable text was found. This appears to be an image-only or scanned PDF. OCR is not available in this importer; use a text-based PDF or convert it to DOCX/TXT first.`);
  }
  return pages.join('\n\n');
}

function parseGoogleDocumentLink(value='') {
  const input = clean(value);
  if (!input) return { id: '', tabId: null };
  let id = '';
  let tabId = null;
  const match = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) id = match[1];
  else if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) id = input;
  else throw new Error('Paste a valid Google Docs document link, or leave the field empty and choose a document from Drive.');
  try {
    const url = new URL(input);
    tabId = url.searchParams.get('tab') || null;
    if (!tabId && url.hash) {
      const hash = url.hash.replace(/^#/, '');
      tabId = new URLSearchParams(hash.includes('?') ? hash.split('?').pop() : hash).get('tab') || null;
      if (!tabId) tabId = hash.match(/(?:^|&)tab=([^&]+)/)?.[1] || null;
    }
  } catch {
    const tabMatch = input.match(/[?&#]tab=([^&#]+)/);
    if (tabMatch) tabId = decodeURIComponent(tabMatch[1]);
  }
  return { id, tabId };
}

async function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gidireads-google-identity]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in could not load. Check your connection and try again.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true; script.dataset.gidireadsGoogleIdentity = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google sign-in could not load. Check your connection and try again.'));
    document.head.appendChild(script);
  });
  if (!window.google?.accounts?.oauth2) throw new Error('Google sign-in did not initialise.');
}

async function loadGooglePickerLibrary() {
  if (window.google?.picker?.PickerBuilder) return;
  if (!window.gapi) {
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gidireads-google-api]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Picker could not load. Check your connection and try again.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true; script.defer = true; script.dataset.gidireadsGoogleApi = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Google Picker could not load. Check your connection and try again.'));
      document.head.appendChild(script);
    });
  }
  await new Promise((resolve, reject) => {
    if (window.google?.picker?.PickerBuilder) return resolve();
    window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Picker could not initialise.')), timeout: 10000, ontimeout: () => reject(new Error('Google Picker took too long to load.')) });
  });
  if (!window.google?.picker?.PickerBuilder) throw new Error('Google Picker did not initialise.');
  state.googlePickerLoaded = true;
}

function requestGoogleAccessToken() {
  return new Promise((resolve, reject) => {
    state.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_DOCS_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response?.error || !response?.access_token) reject(new Error(response?.error_description || 'Google did not grant access to the document you selected.'));
        else { state.googleAccessToken = response.access_token; resolve(response.access_token); }
      },
      error_callback: () => reject(new Error('Google sign-in was closed or could not be completed.'))
    });
    state.googleTokenClient.requestAccessToken({ prompt: state.googleAccessToken ? '' : 'consent' });
  });
}

function openGooglePicker() {
  const apiKey = String(GOOGLE_PICKER_API_KEY || '').trim();
  if (!apiKey || apiKey === 'PASTE_RESTRICTED_GOOGLE_API_KEY_HERE') {
    throw new Error('Google Picker is configured, but its restricted browser API key has not been added to google-docs-config.js yet.');
  }
  if (!GOOGLE_DOCS_CLIENT_ID || !GOOGLE_CLOUD_PROJECT_NUMBER) throw new Error('Google Picker credentials are incomplete. Check google-docs-config.js.');
  const picker = new window.google.picker.PickerBuilder()
    .addView(new window.google.picker.DocsView(window.google.picker.ViewId.DOCS).setMimeTypes('application/vnd.google-apps.document').setMode(window.google.picker.DocsViewMode.LIST))
    .setOAuthToken(state.googleAccessToken)
    .setDeveloperKey(apiKey)
    .setAppId(GOOGLE_CLOUD_PROJECT_NUMBER)
    .setOrigin(window.location.origin)
    .setTitle('Choose a Google Doc to import')
    .setMaxItems(1)
    .setCallback(async (data) => {
      if (data.action === window.google.picker.Action.CANCEL) return;
      if (data.action !== window.google.picker.Action.PICKED) return;
      const doc = data[window.google.picker.Response.DOCUMENTS]?.[0];
      const fileId = doc?.[window.google.picker.Document.ID];
      if (!fileId) { showMessage('Google Picker did not return a document ID. Please choose the document again.', 'error'); return; }
      const pasted = parseGoogleDocumentLink($('googleDocUrl')?.value || '');
      if (pasted.id && pasted.id !== fileId) {
        showMessage('The selected Google Doc does not match the link you pasted. Choose the same document, or clear the link and try again.', 'error');
        return;
      }
      state.selectedGoogleFileId = fileId;
      state.pendingTabId = pasted.tabId;
      const title = doc[window.google.picker.Document.NAME] || 'Google document';
      if ($('googleDocUrl') && !pasted.id && doc[window.google.picker.Document.URL]) $('googleDocUrl').value = doc[window.google.picker.Document.URL];
      try {
        await loadGoogleDocTabs(fileId, state.pendingTabId, title);
      } catch (error) {
        showMessage(error.message || 'The selected Google Doc could not be read.', 'error');
      }
    })
    .build();
  picker.setVisible(true);
}

function collectTabTree(tabs=[], output=[]) {
  for (const tab of tabs || []) {
    const title = tab.tabProperties?.title || `Tab ${output.length + 1}`;
    const body = tab.documentTab?.body?.content || [];
    const text = extractGoogleBodyText(body);
    output.push({ id: tab.tabProperties?.tabId || `tab-${output.length}`, title, text });
    collectTabTree(tab.childTabs || [], output);
  }
  return output;
}

function extractGoogleBodyText(content=[]) {
  const chunks = [];
  for (const item of content || []) {
    if (item.paragraph?.elements) {
      const line = item.paragraph.elements.map(element => element.textRun?.content || '').join('');
      if (line) chunks.push(line);
    }
    if (item.table?.tableRows) {
      for (const row of item.table.tableRows) for (const cell of row.tableCells || []) chunks.push(extractGoogleBodyText(cell.content));
    }
    if (item.tableOfContents?.content) chunks.push(extractGoogleBodyText(item.tableOfContents.content));
  }
  return clean(chunks.join('\n'));
}

function renderGoogleTabs() {
  const host = $('googleDocsTabList');
  const picker = $('googleDocsTabPicker');
  if (!host || !picker) return;
  picker.hidden = !state.googleTabs.length;
  $('googleDocsTabCount').textContent = `${state.googleTabs.length} named tab${state.googleTabs.length === 1 ? '' : 's'} found`;
  host.innerHTML = state.googleTabs.map((tab, index) => `<label class="google-doc-tab"><input type="checkbox" data-google-tab="${index}" checked><span><strong>${escapeHtml(tab.title)}</strong><small>${wordCount(tab.text).toLocaleString()} words</small></span></label>`).join('');
  $('prepareGoogleDocTabs').disabled = !state.googleTabs.some(tab => tab.text.trim());
  host.querySelectorAll('[data-google-tab]').forEach(input => input.addEventListener('change', updateGoogleTabSelection));
}

function updateGoogleTabSelection() {
  const selected = [...document.querySelectorAll('[data-google-tab]:checked')].map(input => state.googleTabs[Number(input.dataset.googleTab)]).filter(tab => tab?.text.trim());
  $('prepareGoogleDocTabs').disabled = !selected.length;
  const all = selected.length === state.googleTabs.filter(tab => tab.text.trim()).length;
  $('googleDocsSelectAll').textContent = all ? 'Clear selection' : 'Select all';
}

async function loadGoogleDocTabs(id, preferredTabId = null, pickedTitle = '') {
  if (!id || !state.googleAccessToken) throw new Error('Choose a Google Doc from Drive first.');
  showMessage('Reading the selected Google Doc…');
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}?includeTabsContent=true`, { headers: { Authorization: `Bearer ${state.googleAccessToken}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error('Google could not open the selected document. Check that the signed-in Google account can view it and that Google Docs API is enabled.');
    if (response.status === 404) throw new Error('Google could not find the selected document. Check its sharing access and try again.');
    throw new Error(payload.error?.message || 'Google Docs could not return this document.');
  }
  let tabs = collectTabTree(payload.tabs || []);
  if (!tabs.length) {
    const text = extractGoogleBodyText(payload.body?.content || []);
    if (text) tabs.push({ id: 'document-body', title: payload.title || pickedTitle || 'Document', text });
  }
  if (preferredTabId) {
    const selectedTab = tabs.find(tab => tab.id === preferredTabId);
    if (!selectedTab) throw new Error('The tab in the link could not be found in this document. Check that the link still points to an existing tab.');
    tabs = [selectedTab];
  }
  state.googleTabs = tabs.filter(tab => tab.text.trim());
  if (!state.googleTabs.length) throw new Error('No readable text was found in the selected document tab.');
  renderGoogleTabs();
  updateGoogleTabSelection();
  showMessage(preferredTabId ? `Loaded the linked tab: ${state.googleTabs[0].title}.` : `Loaded ${state.googleTabs.length} document tab${state.googleTabs.length === 1 ? '' : 's'}. Choose the tab or tabs to preview.`, 'success');
}

function prepareSelectedGoogleTabs() {
  const selected = [...document.querySelectorAll('[data-google-tab]:checked')].map(input => state.googleTabs[Number(input.dataset.googleTab)]).filter(tab => tab?.text.trim());
  if (!selected.length) { showMessage('Select at least one tab with readable text.', 'error'); return; }
  // Google Docs tab boundaries are authoritative: exactly one selected tab becomes one draft.
  // Do not split a tab again based on headings inside its manuscript text.
  const items = selected.map((tab) => ({
    title: clean(tab.title) || 'Untitled Google Docs tab',
    content: clean(tab.text),
    source: `Google Docs · ${tab.title}`,
    include: true,
    duplicate: false,
    duplicateReason: ''
  }));
  if (items.length > 100) { showMessage('The selected tabs contain more than 100 chapter sections. Select fewer tabs and import in batches.', 'error'); return; }
  state.items = items;
  markDuplicates();
  renderPreview();
  showMessage(`Prepared ${items.length} chapter draft${items.length === 1 ? '' : 's'} from ${selected.length} selected tab${selected.length === 1 ? '' : 's'}. Review before saving.`, 'success');
  $('bulkImportPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function readFile(file) {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB. Split it into smaller files and try again.`);
  if (/\.(txt|md|markdown)$/.test(name)) return file.text();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return readPdf(file);
  if (name.endsWith('.docx')) {
    if (!window.mammoth) await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('The Word reader could not load. Check your internet connection or use a TXT file.'));
      document.head.appendChild(script);
    });
    return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  throw new Error(`${file.name}: use a PDF, Word (.docx), TXT or Markdown (.md) file.`);
}

function markDuplicates() {
  const seenContent = new Set(state.existing.map((c) => norm(c.content)).filter(Boolean));
  state.items.forEach((item) => {
    const contentKey = norm(item.content);
    item.duplicate = false; item.duplicateReason = '';
    if (contentKey && seenContent.has(contentKey)) { item.duplicate = true; item.duplicateReason = 'This exact text already exists in this story or import.'; }
    if (contentKey) seenContent.add(contentKey);
  });
}

function showMessage(message, type = '') {
  const box = $('bulkImportMessage');
  box.textContent = message;
  box.className = `bulk-import-message ${type}`;
  box.hidden = !message;
}

function renderPreview() {
  const list = $('bulkImportPreview');
  if (!state.items.length) { list.innerHTML = '<p class="bulk-import-empty">Your chapters will appear here before anything is saved.</p>'; $('bulkImportSummary').textContent = ''; $('bulkImportSave').disabled = true; return; }
  const included = state.items.filter((x) => x.include && !x.duplicate).length;
  const duplicates = state.items.filter((x) => x.duplicate).length;
  $('bulkImportSummary').textContent = `${state.items.length} found · ${included} ready to import · ${duplicates} possible duplicates`;
  list.innerHTML = state.items.map((item, index) => `<article class="bulk-import-row" data-index="${index}">
    <div class="bulk-import-row-top"><label class="bulk-import-include"><input type="checkbox" data-include="${index}" ${item.include ? 'checked' : ''} ${item.duplicate ? 'disabled' : ''}><span>${String(index + 1).padStart(2, '0')}</span></label>
    <div class="bulk-import-row-actions"><button type="button" data-up="${index}" aria-label="Move chapter up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-down="${index}" aria-label="Move chapter down" ${index === state.items.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-remove="${index}" aria-label="Remove chapter">×</button></div></div>
    <label class="bulk-import-field"><span>Chapter title</span><input type="text" maxlength="160" data-title="${index}" value="${escapeHtml(item.title)}"></label>
    <div class="bulk-import-row-meta"><span>${wordCount(item.content).toLocaleString()} words</span><span>${escapeHtml(item.source)}</span></div>
    <details><summary>Preview chapter text</summary><p>${escapeHtml(item.content.slice(0, 1200))}${item.content.length > 1200 ? '…' : ''}</p></details>
    ${item.duplicate ? `<p class="bulk-import-duplicate">${escapeHtml(item.duplicateReason)} It will be skipped.</p>` : ''}
  </article>`).join('');
  list.querySelectorAll('[data-title]').forEach((input) => input.addEventListener('input', () => { state.items[+input.dataset.title].title = input.value; }));
  list.querySelectorAll('[data-include]').forEach((input) => input.addEventListener('change', () => { state.items[+input.dataset.include].include = input.checked; renderPreview(); }));
  list.querySelectorAll('[data-up]').forEach((button) => button.addEventListener('click', () => moveItem(+button.dataset.up, -1)));
  list.querySelectorAll('[data-down]').forEach((button) => button.addEventListener('click', () => moveItem(+button.dataset.down, 1)));
  list.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => { state.items.splice(+button.dataset.remove, 1); markDuplicates(); renderPreview(); }));
  $('bulkImportSave').disabled = included === 0 || state.busy;
}

function moveItem(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.items.length) return;
  [state.items[index], state.items[target]] = [state.items[target], state.items[index]];
  renderPreview();
}

async function loadStoryContext() {
  if (!state.storyId) throw new Error('Open this tool from a story workspace first.');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Log in to import chapters.');
  state.userId = user.id;
  const { data: story, error: storyError } = await supabase.from('stories').select('id,title').eq('id', state.storyId).eq('author_id', user.id).single();
  if (storyError || !story) throw new Error('This story is not available in your author account.');
  state.story = story;
  const { data: chapters, error } = await supabase.from('chapters').select('id,chapter_number,title,content,display_order').eq('story_id', state.storyId).order('display_order', { ascending: true });
  if (error) throw new Error('We could not check your existing chapters. Please refresh and try again.');
  state.existing = chapters || [];
}

async function importFiles(files) {
  showMessage('Reading your files…');
  const all = [];
  for (const file of files) {
    const text = await readFile(file);
    const parts = splitText(text, file.name);
    if (!parts.length) throw new Error(`${file.name}: no chapter text was found. Add chapter headings such as “Chapter 1”.`);
    all.push(...parts);
  }
  if (all.length > 100) throw new Error('You can review up to 100 chapters in one import. Split the manuscript into smaller batches.');
  state.items = all;
  markDuplicates();
  renderPreview();
  showMessage('Review the titles and order below. Nothing has been saved yet.', 'success');
}

function htmlFromText(text) {
  return clean(text).split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

async function saveChapters() {
  if (state.busy) return;
  const selected = state.items.filter((item) => item.include && !item.duplicate);
  if (!selected.length) { showMessage('Choose at least one chapter that is not marked as a duplicate.', 'error'); return; }
  if (selected.some((item) => !clean(item.title) || !clean(item.content))) { showMessage('Every selected chapter needs a title and text.', 'error'); return; }
  if (!confirm(`Save ${selected.length} chapter${selected.length === 1 ? '' : 's'} as drafts in “${state.story.title}”? Nothing will be published.`)) return;
  state.busy = true; $('bulkImportSave').disabled = true; $('bulkImportSave').textContent = 'Saving drafts…';
  showMessage('Saving your chapters as drafts…');
  const { data: latest, error: latestError } = await supabase.from('chapters').select('chapter_number,display_order').eq('story_id', state.storyId);
  if (latestError) { state.busy = false; $('bulkImportSave').textContent = 'Save chapters as drafts'; renderPreview(); showMessage('We could not prepare the import. No chapters were saved.', 'error'); return; }
  const numbers = (latest || []).map((c) => Number(c.chapter_number)).filter((n) => Number.isInteger(n) && n > 0);
  let nextNumber = Math.max(0, ...numbers) + 1;
  let nextOrder = Math.max(-1, ...(latest || []).map((c) => Number(c.display_order)).filter(Number.isFinite)) + 1;
  const results = { saved: [], failed: [] };
  for (const item of selected) {
    const payload = { story_id: state.storyId, chapter_number: nextNumber, display_order: nextOrder, title: clean(item.title), content: clean(item.content), content_html: htmlFromText(item.content), author_note: null, content_type: 'chapter', is_published: false };
    const { data, error } = await supabase.from('chapters').insert(payload).select('id').single();
    if (error) results.failed.push({ title: item.title, message: error.message });
    else { results.saved.push(item.title); nextNumber += 1; nextOrder += 1; }
  }
  state.busy = false; $('bulkImportSave').textContent = 'Save chapters as drafts';
  if (results.saved.length) {
    showMessage(`${results.saved.length} chapter${results.saved.length === 1 ? '' : 's'} saved as drafts${results.failed.length ? `. ${results.failed.length} could not be saved.` : '.'} ${results.failed.length ? 'Check the report below.' : 'Your manuscript is updated.'}`, results.failed.length ? 'warning' : 'success');
    $('bulkImportReport').hidden = false;
    $('bulkImportReport').innerHTML = `<h3>Import report</h3><p>${results.saved.length} saved · ${results.failed.length} not saved</p>${results.failed.length ? `<ul>${results.failed.map((f) => `<li><strong>${escapeHtml(f.title)}</strong>: ${escapeHtml(f.message)}</li>`).join('')}</ul>` : '<p>All selected chapters were saved successfully.</p>'}<a href="story-workspace.html?story=${encodeURIComponent(state.storyId)}">Return to the manuscript</a>`;
    state.items = results.failed.map((failure) => ({ ...selected.find((item) => item.title === failure.title), include: true })).filter(Boolean);
    await loadStoryContext();
    markDuplicates();
    renderPreview();
    if (!results.failed.length) { $('bulkImportFile').value = ''; $('bulkImportPaste').value = ''; }
  } else {
    showMessage('No chapters were saved. Check the report and try again.', 'error');
    $('bulkImportReport').hidden = false;
    $('bulkImportReport').innerHTML = `<h3>Import report</h3><ul>${results.failed.map((f) => `<li><strong>${escapeHtml(f.title)}</strong>: ${escapeHtml(f.message)}</li>`).join('')}</ul>`;
  }
}

function setup() {
  const panel = $('bulkChapterImport');
  if (!panel) return;
  $('bulkImportToggle').addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('bulkImportFile').addEventListener('change', async (event) => { try { await importFiles([...event.target.files]); } catch (error) { showMessage(error.message || 'We could not read those files.', 'error'); } });
  $('bulkImportPasteButton').addEventListener('click', () => {
    const parts = splitText($('bulkImportPaste').value, 'Pasted text');
    if (!parts.length) { showMessage('Paste your chapters first. Use headings such as “Chapter 1” to split them.', 'error'); return; }
    if (parts.length > 100) { showMessage('You can review up to 100 chapters in one import.', 'error'); return; }
    state.items = parts; markDuplicates(); renderPreview(); showMessage('Review the chapters below. Nothing has been saved yet.', 'success');
  });
  $('bulkImportSave').addEventListener('click', saveChapters);
  $('loadGoogleDocTabs')?.addEventListener('click', async () => {
    const button = $('loadGoogleDocTabs');
    button.disabled = true;
    try {
      if (!GOOGLE_DOCS_CLIENT_ID) throw new Error('The GidiReads Google OAuth Client ID is missing from google-docs-config.js.');
      const pasted = parseGoogleDocumentLink($('googleDocUrl')?.value || '');
      await loadGoogleIdentity();
      await loadGooglePickerLibrary();
      await requestGoogleAccessToken();
      state.pendingTabId = pasted.tabId;
      openGooglePicker();
    } catch (error) {
      showMessage(error.message || 'Google Picker could not be opened.', 'error');
    } finally {
      button.disabled = false;
    }
  });
  $('googleDocsSelectAll')?.addEventListener('click', () => { const inputs=[...document.querySelectorAll('[data-google-tab]')]; const selectAll=inputs.some(input=>!input.checked); inputs.forEach(input=>{input.checked=selectAll;}); updateGoogleTabSelection(); });
  $('prepareGoogleDocTabs')?.addEventListener('click', prepareSelectedGoogleTabs);
  $('bulkImportClear').addEventListener('click', () => { state.items = []; state.googleTabs = []; state.googleAccessToken = null; state.selectedGoogleFileId = null; state.pendingTabId = null; $('bulkImportFile').value = ''; $('bulkImportPaste').value = ''; $('googleDocUrl').value = ''; $('googleDocsTabPicker').hidden = true; $('googleDocsTabList').innerHTML = ''; $('bulkImportReport').hidden = true; showMessage(''); renderPreview(); });
  loadStoryContext().then(() => { $('bulkImportStoryName').textContent = `Importing into: ${state.story.title}`; }).catch((error) => showMessage(error.message, 'error'));
  renderPreview();
}

setup();
