import { supabase } from './supabaseClient.js';
const form=document.querySelector('#aeApplyForm'),notice=document.querySelector('#aeApplyNotice'),submit=document.querySelector('#aeSubmit');
const say=(message,type='')=>{notice.textContent=message;notice.dataset.type=type;notice.hidden=!message;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabels={in_review:'In review',approved:'Approved',rejected:'Rejected'};
function renderStatus(app){
  form.hidden=true;
  const status=['approved','rejected','in_review'].includes(app.status)?app.status:'in_review';
  const approved=status==='approved';
  const rejected=status==='rejected';
  notice.hidden=false;
  notice.dataset.type=approved||!rejected?'success':'error';
  const heading=approved
    ?'Your AE application has been approved.'
    :rejected
      ?'Your AE application was not approved.'
      :'You have already submitted an AE application.';
  const copy=approved
    ?'Your Acquisition Editor role is active. Follow the steps below to open your workspace.'
    :rejected
      ?'The admin team has reviewed your application. Their decision and any note are shown below.'
      :'Your application has been received by the GidiReads team. You do not need to submit another one. You can return here to check its status.';
  notice.innerHTML=`<section class="ae-application-state ${approved?'is-approved':''} ${rejected?'is-rejected':''}">
    <div class="ae-state-mark">${rejected?'!':'✓'}</div>
    <p class="ae-kicker">AE APPLICATION</p>
    <h2>${heading}</h2>
    <p class="ae-state-copy">${copy}</p>
    <div class="ae-status-line"><span>Application status</span><strong>${esc(statusLabels[status]||status)}</strong></div>
    ${app.submitted_at?`<div class="ae-status-line"><span>Submitted</span><strong>${new Date(app.submitted_at).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</strong></div>`:''}
    ${app.admin_note?`<div class="ae-admin-note"><span>Message from the team</span><p>${esc(app.admin_note)}</p></div>`:rejected?'<p class="ae-state-copy">No additional note was provided.</p>':''}
    ${approved?`<div class="ae-approved-details"><h3>Your AE appointment</h3><div class="ae-status-line"><span>Role</span><strong>Acquisitions &amp; Developmental Editor</strong></div><div class="ae-status-line"><span>Contract period</span><strong>${app.contract_start&&app.contract_end?`${new Date(app.contract_start).toLocaleDateString()} – ${new Date(app.contract_end).toLocaleDateString()}`:'To be confirmed by the admin team'}</strong></div><p>Your workspace gives you access to assigned authors, editorial reviews, author scouting and promotion recommendations. Final contracts and promotion decisions remain with the admin team.</p><h3>How AE bonuses work</h3><p>GidiReads plans to introduce AE monetisation after an initial period of approximately <strong>2–3 months</strong>. This gives the platform time to establish the programme and assess contributions. Eligible work may include successfully bringing authors onto GidiReads, approved promotions, completed editorial reviews and other verified contributions.</p><p><strong>Bonus amounts and payment terms have not been set yet.</strong> No fixed salary, rate or guaranteed amount is being promised at this stage. Any approved bonus structure and eligibility rules will be communicated before the programme begins.</p><a class="ae-button" href="ae.html">Open my AE workspace</a></div>`:''}
  </section>`;
}
const {data:{session}}=await supabase.auth.getSession();
if(!session){form.hidden=true;say('Please sign in to apply. Your answers will be saved to your GidiReads account.');}
else{
 const {data:existing,error}=await supabase.from('ae_applications').select('status,admin_note,submitted_at,contract_start,contract_end').eq('user_id',session.user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle();
 if(error){form.hidden=true;say('We could not check your application status. Please refresh before trying again.','error');}
 else if(existing)renderStatus(existing);
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(submit.disabled)return;
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){form.hidden=true;say('Please sign in first, then return to this page.','error');return;}
 const fd=new FormData(form);
 const answers={experience:String(fd.get('experience')).trim(),approach:String(fd.get('approach')).trim(),platform_understanding:String(fd.get('platform_understanding')).trim(),sample_feedback:String(fd.get('sample_feedback')).trim(),availability:String(fd.get('availability')),links:String(fd.get('links')||'').trim()};
 submit.disabled=true;submit.textContent='Sending…';
 const {data,error}=await supabase.rpc('submit_ae_application',{p_answers:answers});
 if(error){
   if(/already_applied|duplicate key|ae_one_pending_application_per_user/i.test(error.message||'')){
     const {data:existing}=await supabase.from('ae_applications').select('status,admin_note,submitted_at,contract_start,contract_end').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle();
     if(existing){renderStatus(existing);return;}
     say('An application already exists for this account. Refresh this page to view its status.','error');form.hidden=true;
   }else say(`Your application could not be sent. ${error.message}`,'error');
   submit.disabled=false;submit.textContent='Send application';
   return;
 }
 renderStatus({status:data?.status||'in_review',submitted_at:new Date().toISOString()});
});
