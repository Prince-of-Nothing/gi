import { supabase } from './supabaseClient.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const words = value => {
  const clean = String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').trim();
  return clean ? clean.split(/\s+/).filter(Boolean).length : 0;
};
const date = value => {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' });
};
const contractType = value => ({ non_exclusive:'Non-exclusive', exclusive:'Exclusive', echoes_only:'Echoes-only', echo_only:'Echoes-only' }[String(value || '').toLowerCase()] || 'Contract');
const statusLabel = value => ({ offer_issued:'Offer available', submitted:'Under review', pending:'Under review', in_review:'Under review', approved:'Approved', declined:'Not approved', withdrawn:'Withdrawn', accepted:'Signed', active:'Active', signed:'Signed' }[String(value || '').toLowerCase()] || String(value || 'Received').replace(/[_-]/g, ' '));
const isSigned = contract => ['active','accepted','signed'].includes(String(contract?.status || '').toLowerCase());
const isUnresolved = value => typeof value === 'string' && /\[[^\]]+\]/.test(value);
const cleanTerm = value => value == null || value === '' || isUnresolved(value) ? '' : String(value);
const sharesText = shares => {
  if (!shares || typeof shares !== 'object' || Array.isArray(shares)) return '';
  return Object.entries(shares).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}%`).join(' · ');
};

let user = null;
let storyCache = new Map();
let loading = false;
let loadSequence = 0;

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const toggle = $('themeToggle');
  if (toggle) {
    toggle.textContent = dark ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#100a16' : '#f4efe7');
}
applyTheme(localStorage.getItem('gidireads-authors-theme') === 'dark');
$('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  localStorage.setItem('gidireads-authors-theme', dark ? 'dark' : 'light');
  applyTheme(dark);
});

function notice(message, type = '') {
  $('ceNotice').textContent = message;
  $('ceNotice').className = `ce-notice${type ? ` ${type}` : ''}`;
}

function renderContract(contract, titleMap) {
  const terms = contract.terms_snapshot && typeof contract.terms_snapshot === 'object' ? contract.terms_snapshot : {};
  const title = titleMap.get(contract.story_id) || terms.story_title || 'Your contracted story';
  const start = contract.starts_at || contract.accepted_at;
  const end = contract.ends_at;
  const status = isSigned(contract) ? 'Active contract' : statusLabel(contract.status);
  const rights = cleanTerm(terms.rights_scope || terms.rights_description);
  const shares = sharesText(terms.revenue_shares);
  const exclusivity = cleanTerm(terms.exclusivity_period || terms.exclusivity);
  const agreement = cleanTerm(contract.agreement_version || terms.agreement_version);
  const detailRows = [
    start ? `<div><span>Start date</span><strong>${esc(date(start))}</strong></div>` : '',
    end ? `<div><span>Contract end date</span><strong>${esc(date(end))}</strong></div>` : '',
    agreement ? `<div><span>Agreement</span><strong>${esc(agreement)}</strong></div>` : '',
    shares ? `<div><span>Revenue share</span><strong>${esc(shares)}</strong></div>` : '',
    rights ? `<div class="ce-contract-rights"><span>Rights covered</span><strong>${esc(rights)}</strong></div>` : '',
    exclusivity ? `<div><span>Exclusivity</span><strong>${esc(exclusivity)}</strong></div>` : ''
  ].filter(Boolean).join('');
  return `<article class="ce-contract-card">
    <div class="ce-contract-top"><div><p class="ce-contract-kicker">YOUR AGREEMENT</p><h3>${esc(title)}</h3><p class="ce-contract-type">${esc(contractType(contract.contract_type))} contract</p></div><span class="ce-status ce-status-active">${esc(status)}</span></div>
    <div class="ce-contract-details">${detailRows || '<p class="ce-contract-note">Your signed contract is recorded. Some agreement details are not available in this view.</p>'}</div>
    <div class="ce-onboarding-note"><strong>Your contract is active.</strong><p>Congratulations. You can now manage your contracted story in Authors Studio. Check your story details, keep your chapters up to date and look out for messages from your assigned editor.</p><a href="authors-studio.html">Open Authors Studio</a></div>
  </article>`;
}

function renderApplication(application, titleMap, signedStoryIds) {
  const offer = application.offer && typeof application.offer === 'object' ? application.offer : {};
  const data = application.application_data && typeof application.application_data === 'object' ? application.application_data : {};
  const signed = signedStoryIds.has(application.story_id);
  const title = titleMap.get(application.story_id) || data.story_title || 'Story application';
  const status = signed ? 'Contract signed' : statusLabel(application.status);
  const type = cleanTerm(contractType(offer.contract_type));
  const agreement = cleanTerm(offer.agreement_version);
  const shares = sharesText(offer.revenue_shares);
  const rights = cleanTerm(offer.rights_scope);
  const duration = cleanTerm(offer.duration) || (Number(offer.duration_months) > 0 ? `${Number(offer.duration_months)} months` : '');
  const hasOffer = Boolean(application.offer && !signed && ['offer_issued','offered'].includes(String(application.status || '').toLowerCase()));
  const offerDetails = hasOffer ? `<div class="ce-offer-panel"><div class="ce-approved-banner"><strong>YOUR CONTRACT HAS BEEN APPROVED🎉</strong><p>We have reviewed your story and would like to offer you a contract. Read the terms below, then choose whether to accept or reject the offer.</p></div><p class="ce-offer-heading">Your contract offer</p>
    ${type ? `<p><strong>Contract type</strong><span>${esc(type)}</span></p>` : ''}
    ${agreement ? `<p><strong>Agreement</strong><span>${esc(agreement)}</span></p>` : ''}
    ${shares ? `<p><strong>Revenue share</strong><span>${esc(shares)}</span></p>` : ''}
    ${rights ? `<p><strong>Rights covered</strong><span>${esc(rights)}</span></p>` : ''}
    ${duration ? `<p><strong>Proposed term</strong><span>${esc(duration)}</span></p>` : ''}
    ${application.offer_expires_at ? `<p class="ce-offer-expiry"><strong>Offer must be accepted by</strong><span>${esc(date(application.offer_expires_at))}</span></p>` : ''}
    ${!duration ? '<p class="ce-contract-note">The proposed term is being confirmed by GidiReads. Please wait for the complete offer before accepting.</p>' : ''}
  </div>` : '';
  const summaryRows = [
    ['Synopsis', data.synopsis], ['Main characters and story arc', data.protagonist], ['Tropes and themes', data.tropes],
    ['What makes the story stand out', data.wow_factor], ['Worldbuilding and setting', data.worldbuilding],
    ['Publishing plan', data.update_schedule], ['Readiness', data.ready_status], ['Rights and adaptation', data.adaptation_rights],
    ['Additional information', data.additional_info]
  ].filter(([, value]) => value);
  return `<article class="ce-item ce-application-item"><div class="ce-item-main">
    <div class="ce-application-title-row"><h3>${esc(title)}</h3><span class="ce-status ${signed ? 'ce-status-active' : ''}">${esc(status)}</span></div>
    <p class="ce-application-meta">Submitted ${esc(date(application.submitted_at))}</p>
    ${data.format ? `<p><strong>Format:</strong> ${esc(data.format)}${data.content_type ? ` · ${esc(data.content_type)}` : ''}</p>` : ''}
    ${application.author_note ? `<p><strong>Your note:</strong> ${esc(application.author_note)}</p>` : ''}
    ${application.admin_note ? `<div class="ce-response-note"><strong>Message from GidiReads</strong><p>${esc(application.admin_note)}</p></div>` : ''}
    ${offerDetails}
    ${summaryRows.length ? `<details class="ce-submission-details"><summary>View application details</summary><div class="ce-application-summary">${summaryRows.map(([label, value]) => `<p><strong>${esc(label)}:</strong> ${esc(value)}</p>`).join('')}</div></details>` : ''}
  </div><div class="ce-actions">${!signed && application.status === 'offer_issued' ? `<button class="ce-btn ce-accept-btn" data-accept="${esc(application.id)}" ${duration ? '' : 'disabled'}>Accept contract</button><button class="ce-btn ce-reject-btn" data-reject="${esc(application.id)}">Reject offer</button>` : ''}</div></article>`;
}

function openApplication(story) {
  const panel = $('ceApplicationPanel');
  const form = $('applicationForm');
  form.reset();
  $('applicationStoryId').value = story.id;
  $('applicationStoryTitle').value = story.title || 'Untitled story';
  $('applicationGenre').value = [story.primary_genre, story.secondary_genre].filter(Boolean).join(', ');
  form.elements.namedItem('synopsis').value = story.description || '';
  $('sourceWorkWrap').hidden = true;
  form.elements.namedItem('source_work').required = false;
  panel.hidden = false;
  $('applicationHeading').textContent = `Application: ${story.title || 'Untitled story'}`;
  $('applicationFormStatus').textContent = '';
  panel.scrollIntoView({ behavior:'smooth', block:'start' });
}

async function load() {
  if (loading) return;
  loading = true;
  const sequence = ++loadSequence;
  notice('Loading your contract information…');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    user = session?.user || null;
    $('loginBtn').textContent = user ? 'Log out' : 'Log in';
    if (!user) {
      $('ceLogin').hidden = false;
      $('ceMain').hidden = true;
      notice('Sign in to view your stories, applications and agreements.');
      return;
    }
    $('ceLogin').hidden = true;
    $('ceMain').hidden = false;

    const [storyResult, applicationResult, contractResult, aeAssignmentResult] = await Promise.all([
      supabase.from('stories').select('id,title,description,primary_genre,secondary_genre,status,updated_at').eq('author_id', user.id).in('status', ['ongoing','completed']).order('updated_at', { ascending:false }),
      supabase.from('contract_applications').select('id,story_id,status,author_note,application_data,admin_note,offer,offer_expires_at,submitted_at,updated_at').eq('author_id', user.id).order('submitted_at', { ascending:false }),
      supabase.from('creator_contracts').select('id,story_id,contract_type,status,agreement_version,terms_snapshot,accepted_at,starts_at,ends_at').eq('author_id', user.id).order('accepted_at', { ascending:false }),
      supabase.rpc('author_get_assigned_ae')
    ]);
    if (sequence !== loadSequence) return;
    const errors = [storyResult.error, applicationResult.error, contractResult.error].filter(Boolean);
    if (errors.length) {
      console.warn('Contract Centre data request failed:', errors);
      notice('We could not load all of your contract information. Please try again shortly.', 'error');
    }

    const stories = storyResult.data || [];
    const applications = applicationResult.data || [];
    const contracts = contractResult.data || [];
    storyCache = new Map(stories.map(story => [story.id, story]));
    const titleMap = new Map(stories.map(story => [story.id, story.title || 'Untitled story']));
    const signedContracts = contracts.filter(isSigned);
    const signedStoryIds = new Set(signedContracts.map(contract => contract.story_id));

    let chapters = [];
    if (stories.length) {
      const chapterResult = await supabase.from('chapters').select('story_id,content,content_html,is_published').in('story_id', stories.map(story => story.id)).eq('is_published', true).is('archived_at', null);
      if (chapterResult.error) console.warn('Could not load published chapter totals:', chapterResult.error);
      else chapters = chapterResult.data || [];
    }
    if (sequence !== loadSequence) return;

    const stats = new Map();
    for (const story of stories) {
      const published = chapters.filter(chapter => chapter.story_id === story.id);
      stats.set(story.id, { count:published.length, words:published.reduce((total, chapter) => total + words(chapter.content_html || chapter.content), 0) });
    }
    const openApplicationStoryIds = new Set(applications.filter(app => !['declined','withdrawn'].includes(String(app.status || '').toLowerCase())).map(app => app.story_id));
    $('ceStoryList').innerHTML = stories.length ? stories.map(story => {
      const stat = stats.get(story.id) || { words:0, count:0 };
      const alreadyContracted = signedStoryIds.has(story.id);
      const alreadyApplied = openApplicationStoryIds.has(story.id);
      const eligible = stat.words >= 5000 && !alreadyApplied && !alreadyContracted;
      const state = alreadyContracted ? 'This story already has a signed agreement.' : alreadyApplied ? 'An application or offer is already open for this story.' : eligible ? 'Ready to submit for review.' : 'This story has not reached the current 5,000-word guideline yet.';
      return `<article class="ce-item ce-story-item"><div class="ce-item-main"><h3>${esc(story.title || 'Untitled story')}</h3><p>${stat.words.toLocaleString()} published words <span aria-hidden="true">·</span> ${stat.count} published chapters</p><small>${esc(state)}</small></div><div class="ce-actions"><span class="ce-status">${esc(story.status || 'Published')}</span><button class="ce-btn" data-apply="${esc(story.id)}" ${eligible ? '' : 'disabled'}>${alreadyContracted ? 'Already contracted' : alreadyApplied ? 'Application in progress' : 'Apply for review'}</button></div></article>`;
    }).join('') : '<p class="ce-empty">No published stories are available for review yet.</p>';

    $('ceActiveContracts').innerHTML = signedContracts.length ? signedContracts.map(contract => renderContract(contract, titleMap)).join('') : '<p class="ce-empty">You do not have a signed contract yet. Accepted agreements will appear here.</p>';
    const assignedAes = Array.isArray(aeAssignmentResult.data) ? aeAssignmentResult.data : [];
    const aeReviewSection = $('ceAeReviewSection');
    const aeReviewLinks = $('ceAeReviewLinks');
    if (aeReviewSection && aeReviewLinks) {
      aeReviewSection.hidden = !assignedAes.length && !aeAssignmentResult.error;
      aeReviewLinks.innerHTML = assignedAes.length ? assignedAes.map(ae => `<article class="ce-item"><div class="ce-item-main"><h3>${esc(ae.ae_name || 'Acquisition Editor')}</h3><p>${ae.ae_username ? `@${esc(ae.ae_username)} · ` : ''}Currently assigned to support your contracted work.</p><small>Your review is confidential from the editor and can be updated while this assignment remains active.</small></div><div class="ce-actions"><a class="ce-btn" href="ae-author-feedback.html">Review your AE</a></div></article>`).join('') : (aeAssignmentResult.error ? '<article class="ce-item"><div class="ce-item-main"><h3>Review your Acquisition Editor</h3><p>We could not load your current editor assignment. You can still open the feedback page to check your options.</p></div><div class="ce-actions"><a class="ce-btn" href="ae-author-feedback.html">Open AE feedback</a></div></article>' : '');
    }
    if (aeAssignmentResult.error) console.warn('Could not load assigned Acquisition Editor links:', aeAssignmentResult.error);
    $('ceApplications').innerHTML = applications.length ? applications.map(application => renderApplication(application, titleMap, signedStoryIds)).join('') : '<p class="ce-empty">You have not submitted a contract application yet.</p>';

    if (!errors.length) notice('Your stories, applications and agreements are up to date.', 'success');
  } catch (error) {
    console.error('Contract Centre could not load:', error);
    notice('We could not load your contract information. Please refresh and try again.', 'error');
  } finally {
    loading = false;
  }
}

$('ceStoryList').addEventListener('click', event => {
  const button = event.target.closest('[data-apply]');
  if (!button) return;
  const story = storyCache.get(button.dataset.apply);
  if (story) openApplication(story);
});

$('cancelApplication').addEventListener('click', () => {
  $('ceApplicationPanel').hidden = true;
  $('applicationForm').reset();
  $('sourceWorkWrap').hidden = true;
  $('applicationForm').elements.namedItem('source_work').required = false;
});

$('applicationContentType').addEventListener('change', event => {
  const show = ['Fanfiction','Based on Existing Work'].includes(event.target.value);
  $('sourceWorkWrap').hidden = !show;
  $('applicationForm').elements.namedItem('source_work').required = show;
});

$('applicationForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!user) { notice('Sign in first to submit an application.', 'error'); return; }
  const form = event.currentTarget;
  const formData = new FormData(form);
  const storyId = String(formData.get('story_id') || '');
  const fields = ['story_title','genre','protagonist','key_characters','story_arc','tropes','synopsis','wow_factor','worldbuilding','format','content_type','source_work','story_status','update_schedule','chapters_per_update','expected_length','estimated_chapters','ready_status','continuation_plan','adaptation_rights','additional_info'];
  const application = {};
  for (const key of fields) {
    const value = formData.get(key);
    if (value !== null && String(value).trim()) application[key] = String(value).trim();
  }
  application.owns_rights = formData.get('owns_rights') === 'yes';
  application.no_infringement = formData.get('no_infringement') === 'yes';
  application.truthful_information = formData.get('truthful_information') === 'yes';
  application.review_confirmed = formData.get('review_confirmed') === 'yes';
  if (!storyId || !application.protagonist || !application.tropes || !application.synopsis || !application.wow_factor || !application.format || !application.content_type || !application.update_schedule || !application.chapters_per_update || !application.expected_length || !application.ready_status || !application.adaptation_rights || !application.owns_rights || !application.no_infringement || !application.truthful_information || !application.review_confirmed) {
    notice('Please complete the required questions and declarations.', 'error');
    return;
  }
  const button = $('submitApplication');
  button.disabled = true;
  button.textContent = 'Submitting…';
  $('applicationFormStatus').textContent = 'Sending your application…';
  try {
    const { error } = await supabase.rpc('submit_contract_application', { p_story_id:storyId, p_author_note:application.additional_info || null, p_application_data:application });
    if (error) throw error;
    notice('Your application has been submitted for review.', 'success');
    $('ceApplicationPanel').hidden = true;
    form.reset();
    await load();
  } catch (error) {
    console.error('Contract application submission failed:', error);
    notice('Your application could not be submitted. Please try again.', 'error');
    $('applicationFormStatus').textContent = 'Submission failed. Your answers are still on this form.';
  } finally {
    button.disabled = false;
    button.textContent = 'Submit application for review';
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-accept]');
  if (!button || button.disabled) return;
  if (!confirm('Accept this offer? Please review the contract type, revenue share, rights covered and proposed term before continuing.')) return;
  button.disabled = true;
  try {
    const { error } = await supabase.rpc('accept_contract_offer', { p_application_id:button.dataset.accept });
    if (error) throw error;
    notice('Your acceptance has been recorded.', 'success');
    await load();
  } catch (error) {
    console.error('Offer acceptance failed:', error);
    notice('The offer could not be accepted. Please try again or contact GidiReads support.', 'error');
    button.disabled = false;
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-reject]');
  if (!button || button.disabled) return;
  if (!confirm('Reject this contract offer? You can review the terms again before deciding. This action will close the offer.')) return;
  button.disabled = true;
  try {
    const { error } = await supabase.rpc('decline_contract_offer', { p_application_id:button.dataset.reject });
    if (error) throw error;
    notice('You have rejected the offer. Your story remains yours.', 'success');
    await load();
  } catch (error) {
    console.error('Offer rejection failed:', error);
    notice('We could not record your decision. Please try again.', 'error');
    button.disabled = false;
  }
});

$('loginBtn').addEventListener('click', async () => {
  if (user) {
    await supabase.auth.signOut();
    location.href = 'index.html';
  } else location.href = 'account.html';
});

supabase.auth.onAuthStateChange(() => {
  loading = false;
  load();
});
load();
