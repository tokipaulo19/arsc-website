import {kind,title,filterPosts,counts,adjacentId} from './review-model.js';
const byId=id=>document.getElementById(id);
const privateMode=document.body?.dataset.reviewMode==='authenticated';
const state={posts:[],selected:null,query:'',filter:'all',status:'all',viewer:null,drafts:new Map(),pending:new Map(),feedback:new Map()};
const statusLabel=status=>({needs_review:'Needs review',approved:'Approved',changes_requested:'Changes requested',held:'Held'}[status]||'Needs review');
const visiblePosts=()=>filterPosts(state.posts,state.query,state.filter).filter(p=>state.status==='all'||p.reviewStatus===state.status);
const labels={full:'Caption preview',details:'Details needed',private:'Private review'};
function element(tag,classes,text) {const n=document.createElement(tag);if(classes)n.className=classes;if(text!==undefined)n.textContent=text;return n;}
function button(text,action,classes='button') {const n=element('button',classes,text);n.type='button';if(action)n.addEventListener('click',action);return n;}
function disabledButton(text,classes='button') {const n=button(text,null,classes);n.disabled=true;n.setAttribute('aria-describedby','review-notice');return n;}
function choose(id,focus=true) {state.selected=id;render();if(focus){const selected=Array.from(byId('post-list').querySelectorAll('button')).find(n=>n.dataset.id===id);selected?.focus();selected?.scrollIntoView({block:'nearest'});}}
function visual(post) {
  const v=post.visualTreatment||{};const block=element('div','visual');
  if(v.type==='quote_card_concept') {block.classList.add('quote-concept');block.append(element('span','concept-label','QUOTE CARD CONCEPT'),element('p','quote',v.text||post.hook),element('span','quote-credit','Liliana Sanelli'));}
  else if(v.type==='photo_request') {block.classList.add('photo-request');block.append(element('span','photo-icon','▧'),element('strong','','Photo requested'),element('p','',v.altText||v.text||'An approved photo is still needed.'));}
  else {block.classList.add('text-treatment');block.append(element('span','','Text-only post'),element('small','','No image proposed for this draft.'));}
  if(v.type==='quote_card_concept')block.append(element('small','concept-note','Proposed artwork direction. This is not a finished or approved asset.'));
  return block;
}
async function sendSave(post,body){
  state.pending.set(post.id,body);state.feedback.set(post.id,'Saving…');render();
  try{
    const response=await fetch(`/api/ops/lilianasanelli/posts/${encodeURIComponent(post.id)}`,{method:'PATCH',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(response.ok&&result.ok){state.posts=state.posts.map(p=>p.id===post.id?result.post:p);state.pending.delete(post.id);state.drafts.delete(post.id);state.feedback.set(post.id,result.replayed&&result.post.revision>result.savedRevision?'Previous save confirmed. A newer saved version is shown.':result.approvalInvalidated?'Saved. The text changed, so the previous approval was cleared.':`Saved · ${new Date(result.post.updatedAt).toLocaleString('en-AU')} · ${result.post.updatedBy}`);}
    else if(response.status===409){state.pending.delete(post.id);if(result.post)state.posts=state.posts.map(p=>p.id===post.id?result.post:p);state.feedback.set(post.id,result.conflict?'Another reviewer saved first. The latest saved version is shown; your unsaved text is kept below. Review it before saving again.':result.error||'This draft cannot be approved yet.');}
    else if(response.status<500){state.pending.delete(post.id);state.feedback.set(post.id,response.status===403?'Reviewer access was not confirmed. Sign in again before saving. Your unsaved text is kept.':result.error||'The save was rejected. No decision is confirmed.');}
    else state.feedback.set(post.id,'Save not confirmed. Retry the same save to check its outcome before making another change.');
  }catch{state.feedback.set(post.id,'Save not confirmed. Retry the same save to check its outcome before making another change.');}
  render();
}
function savePost(post,changes){
  const pending=state.pending.get(post.id);if(pending)return sendSave(post,pending);
  return sendSave(post,{requestId:crypto.randomUUID(),expectedRevision:post.revision,expectedContentVersion:post.contentVersion,...changes});
}
function held(post){return post.requiresLilianaInput===true||post.placeholders?.length>0||post.holds?.length>0;}
function reviewControls(post) {
  if(privateMode&&state.viewer){
    const section=element('section','review-controls'),pending=state.pending.has(post.id),draft=state.drafts.get(post.id)||{};
    section.append(element('h3','','Your review'),element('p','muted','Decisions and notes are shared with authorized reviewers. Approval does not schedule or post to LinkedIn.'));
    const label=element('label','','Review notes');label.htmlFor='review-notes';const notes=element('textarea');notes.id='review-notes';notes.rows=4;notes.value=draft.notes??post.notes??'';notes.disabled=pending;
    const feedback=element('p','saved-state',state.feedback.get(post.id)||(post.updatedAt?`Last saved ${new Date(post.updatedAt).toLocaleString('en-AU')} · ${post.updatedBy}`:'No review decision recorded yet.'));feedback.setAttribute('role','status');
    notes.addEventListener('input',()=>{state.drafts.set(post.id,{...state.drafts.get(post.id),notes:notes.value});feedback.textContent='Unsaved notes';});
    const actions=element('div','review-actions');for(const [text,status] of [['✓ Approve draft','approved'],['Request changes','changes_requested'],['Hold','held']]){const b=button(text,()=>savePost(post,{reviewStatus:status,notes:notes.value}),status==='approved'?'button approve':'button');b.disabled=pending||(status==='approved'&&held(post));actions.append(b);}
    const noteSave=button('Save notes',()=>savePost(post,{notes:notes.value}));noteSave.disabled=pending;actions.append(noteSave);
    if(held(post))section.append(element('p','hold-warning','Approval is blocked until the recorded story, detail or permission holds are resolved. Notes and change requests remain available.'));
    section.append(label,notes,actions,feedback);
    if(pending)section.append(button('Retry the same save',()=>sendSave(post,state.pending.get(post.id))));
    if(state.viewer.role==='editor'){
      const edit=element('details','comparison');edit.append(element('summary','','Edit draft copy'));
      const captionLabel=element('label','','Caption');captionLabel.htmlFor='edit-caption';const caption=element('textarea');caption.id='edit-caption';caption.rows=12;caption.value=draft.caption??post.caption;caption.disabled=pending;
      caption.addEventListener('input',()=>{state.drafts.set(post.id,{...state.drafts.get(post.id),caption:caption.value});feedback.textContent='Unsaved copy changes. Saving will clear any existing approval.';});
      const editSave=button('Save revised copy',()=>savePost(post,{caption:caption.value,notes:notes.value}));editSave.disabled=pending;edit.append(element('p','','Editing copy clears its approval and returns it to Needs review.'),captionLabel,caption,editSave);section.append(edit);
    }
    return section;
  }
  const section=element('section','review-controls');const h=element('h3','','Your review');section.append(h,element('p','muted','Sign-in is required before shared review decisions can be recorded.'));
  const actions=element('div','review-actions');actions.append(disabledButton('✓ Approve draft','button approve'),disabledButton('Request changes'),disabledButton('Hold'));
  const label=element('label','','Review notes');label.htmlFor='review-notes';const notes=element('textarea');notes.id='review-notes';notes.rows=3;notes.disabled=true;notes.placeholder='Notes will be available with authorized reviewer access.';notes.setAttribute('aria-describedby','review-notice');
  section.append(actions,label,notes,element('p','saved-state','Read-only · No decisions or notes are saved on this page.'));return section;
}
function renderDetail(post,visible) {
  const detail=byId('draft-detail');detail.replaceChildren();
  if(!post){detail.append(element('div','empty','No drafts match your search. Try another word or choose All drafts.'));return;}
  const k=kind(post);const top=element('div','detail-top');const heading=element('div');heading.append(element('p','eyebrow',`POST ${String(post.sourcePostNumber).padStart(2,'0')} / ${k==='full'?'EDITED DRAFT':labels[k].toUpperCase()}`),element('h2','draft-title',title(post)));
  const nav=element('div','post-arrows');for(const [text,delta,aria] of [['←',-1,'Previous matching draft'],['→',1,'Next matching draft']]){const id=adjacentId(visible,post.id,delta);const b=button(text,()=>choose(id),'arrow');b.disabled=!id;b.setAttribute('aria-label',aria);nav.append(b);}top.append(heading,nav);detail.append(top);
  const metadata=element('div','metadata');metadata.append(element('span','badge needs-review',statusLabel(post.reviewStatus)));
  if(k==='full') metadata.append(element('span','',`${post.characterCount.toLocaleString('en-AU')} characters`));
  if(post.sequence!==undefined)metadata.append(element('span','',`Suggested order ${post.sequence}`));
  detail.append(metadata);
  if(k==='full') {
    const preview=element('section','linkedin-preview');preview.setAttribute('aria-label','LinkedIn-style preview of the edited draft');
    const person=element('div','person');const avatar=element('div','avatar','LS');avatar.setAttribute('aria-hidden','true');const identity=element('div');identity.append(element('strong','','Liliana Sanelli'),element('small','','Personal LinkedIn · proposed copy'),element('small','draft-label','Draft · Not posted'));person.append(avatar,identity);preview.append(person,element('div','caption',post.caption),visual(post));
    const captionFoot=element('div','preview-footer','LinkedIn-style preview · unapproved draft');preview.append(captionFoot);detail.append(preview);
    if(post.dependencies?.length)detail.append(element('p','dependency',`Sequence note: follows post${post.dependencies.length>1?'s':''} ${post.dependencies.join(' and ')}.`));
  } else {
    const held=element('section',`held ${k}`);held.append(element('span','held-icon',k==='private'?'◌':'…'),element('h3','',k==='private'?'Private review required':'A few details are still needed'),element('p','',post.publicSummary));detail.append(held);
  }
  if(privateMode&&(post.holds?.length||post.placeholders?.length||post.requiresLilianaInput||post.requiresPrivateReview)){
    const holds=element('section','hold-panel');holds.append(element('h3','','Review holds and permissions'));
    if(post.requiresPrivateReview)holds.append(element('p','','Private personal content. Confirm consent and factual accuracy before approval.'));
    if(post.requiresLilianaInput)holds.append(element('p','','Liliana’s input is still required.'));
    for(const h of [...(post.holds||[]),...(post.placeholders||[])])holds.append(element('p','',typeof h==='string'?h:JSON.stringify(h)));detail.append(holds);
  }
  const compare=element('details','comparison');const summary=element('summary','','Original versus edited');compare.append(summary);
  if(privateMode)compare.append(element('h3','','Original copy'),element('div','caption',post.originalCaption||post.originalHook||'No original copy recorded.'),element('h3','','Current edited copy'),element('div','caption',post.caption));
  else compare.append(element('p','','Original copy is withheld from this public preview. Comparison requires authorized private reviewer access.'));
  detail.append(compare,reviewControls(post));
  byId('selection-status').textContent=`Post ${post.sourcePostNumber} selected. ${labels[k]}. ${statusLabel(post.reviewStatus)}.`;
}
function render() {
  const visible=visiblePosts();if(!visible.some(p=>p.id===state.selected))state.selected=visible[0]?.id||null;
  const totals=counts(state.posts);byId('approved-count').textContent=`${totals.approved} / ${totals.total}`;byId('approval-progress').value=totals.approved;
  byId('result-count').textContent=`${visible.length} of ${state.posts.length} drafts shown`;
  const list=byId('post-list');list.replaceChildren();
  for(const post of visible){const k=kind(post),selected=post.id===state.selected;const li=element('li');li.setAttribute('role','presentation');const b=button('',()=>choose(post.id),'post-option');b.dataset.id=post.id;b.setAttribute('role','option');b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;b.append(element('span','post-number',String(post.sourcePostNumber).padStart(2,'0')));const copy=element('span','post-option-copy');copy.append(element('span','post-option-title',title(post)),element('small',`kind ${k}`,labels[k]));b.append(copy,element('span','option-indicator',selected?'●':'○'));li.append(b);list.append(li);}
  renderDetail(visible.find(p=>p.id===state.selected),visible);
}
byId('search').addEventListener('input',event=>{state.query=event.target.value;render();});
byId('filter').addEventListener('change',event=>{state.filter=event.target.value;render();});
byId('post-list').addEventListener('keydown',event=>{
  const visible=visiblePosts();let id;
  if(event.key==='ArrowDown')id=adjacentId(visible,state.selected,1);
  else if(event.key==='ArrowUp')id=adjacentId(visible,state.selected,-1);
  else if(event.key==='Home')id=visible[0]?.id;
  else if(event.key==='End')id=visible.at(-1)?.id;
  else return;
  event.preventDefault();if(id)choose(id,true);
});
async function load() {
  try {
    const response=await fetch(privateMode?'/api/ops/lilianasanelli/posts':new URL('./public-posts.json',import.meta.url),{credentials:privateMode?'same-origin':'omit',cache:'no-store'});
    if(!response.ok)throw Error('Draft set unavailable');const data=await response.json();
    if(!Array.isArray(data.posts)||data.posts.length!==40||(!privateMode&&data.posts.some(p=>p.approved!==false||p.reviewStatus!=='needs_review')))throw Error('Draft set not ready');
    if(privateMode){
      if(!data.viewer||!['reviewer','editor'].includes(data.viewer.role))throw Error('Reviewer access required');state.viewer=data.viewer;
      byId('review-notice').replaceChildren(element('strong','',`Private review · ${data.viewer.email}`),element('p','','Notes and decisions save to the shared review record. Original copy and personal stories are visible only in authorized private review.'));
      byId('mode-label').textContent='Private reviewer workspace';byId('overview-help').textContent='Shared approval status. Publication holds remain in force.';
      byId('private-filters').hidden=false;byId('status-filter').addEventListener('change',e=>{state.status=e.target.value;render();});
    }else{
      // Only a public availability flag is requested. Private records and user
      // identities are never fetched by the public preview.
      fetch('/api/ops/lilianasanelli/config',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(c=>{if(c?.reviewAvailable){const link=element('a','button','Sign in to review');link.href='/ops/lilianasanelli/review';byId('review-notice').append(link);}}).catch(()=>{});
    }
    state.posts=data.posts;byId('public-notice').textContent=data.publicNotice;const totals=counts(state.posts);
    byId('post-total').textContent=totals.total;byId('approved-count').textContent=`${totals.approved} / ${totals.total}`;byId('approval-progress').value=totals.approved;byId('approval-progress').max=totals.total;
    render();
  } catch {
    byId('result-count').textContent='Drafts could not be loaded.';byId('draft-detail').replaceChildren(element('div','error','The draft preview is unavailable. Please reload to try again. No review decisions have been saved.'));
  }
}
load();
