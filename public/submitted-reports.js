(function () {
  const $ = id => document.getElementById(id);
  let nextOffset = 0, loading = false;
  const status = $('submitted-status'), list = $('submitted-list'), more = $('more-submitted');
  const login = $('admin-login'), loginError = $('admin-login-error'), refresh = $('refresh-submitted'), logout = $('admin-logout');
  const samplePanel=$('sample-review-panel'), sampleForm=$('sample-review-form'), sampleMessage=$('sample-review-message');
  const sampleSelect=sampleForm.elements.sampleId;
  (window.COMMUNITY_REPORTS||[]).forEach(r=>{const option=document.createElement('option');option.value=r.id;option.textContent=`#${r.id} · ${r.sci} · ${r.basin} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)})`;sampleSelect.append(option);});
  function line(parent, label, value) {
    const div = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = label + ': ';
    div.append(strong, document.createTextNode(value == null || value === '' ? '—' : String(value)));
    parent.append(div);
  }
  function item(report) {
    const card=document.createElement('article'); card.className='submitted-item';
    const heading=document.createElement('h4'); heading.textContent=report.species || 'Unidentified plant'; card.append(heading);
    const meta=document.createElement('div'); meta.className='submitted-meta';
    const received=new Date(report.received_at);
    line(meta,'Basin',report.basin);
    line(meta,'Received',Number.isNaN(received.getTime())?report.received_at:received.toLocaleString('en-LK',{timeZone:'Asia/Colombo',dateStyle:'medium',timeStyle:'short'})+' (Sri Lanka)');
    line(meta,'Status',report.review_status);
    if(report.reviewed_at)line(meta,'Reviewed',new Date(report.reviewed_at).toLocaleDateString('en-LK'));
    if(report.review_note)line(meta,'Admin review note',report.review_note);
    card.append(meta);
    const details=document.createElement('details');
    const summary=document.createElement('summary'); summary.textContent='View report details'; details.append(summary);
    line(details,'Report ID',report.request_id);
    line(details,'Location',`${report.latitude}, ${report.longitude}`);
    line(details,'Observed',report.observed_date);
    line(details,'Amount',report.abundance);
    line(details,'Habitat',report.habitat);
    line(details,'Visible issue',report.degradation);
    line(details,'Notes',report.notes);
    if(report.has_photo) {
      const img=document.createElement('img'); img.src='/api/reports/'+encodeURIComponent(report.request_id)+'/photo'; img.alt='Photograph submitted with this IAS report'; img.loading='lazy'; details.append(img);
    }
    const mapButton=document.createElement('button'); mapButton.className='btn-secondary';mapButton.type='button';mapButton.textContent='View location on map';
    mapButton.addEventListener('click',()=>window.viewOnMap(Number(report.latitude),Number(report.longitude)));
    details.append(mapButton); card.append(details);
    const form=document.createElement('form');form.className='review-form';
    const label=document.createElement('label');label.textContent='Review decision';
    const select=document.createElement('select');['Pending review','Verified','Rejected'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);});select.value=report.review_status;label.append(select);form.append(label);
    const noteLabel=document.createElement('label');noteLabel.textContent='Review note (at least 10 characters)';const note=document.createElement('textarea');note.required=true;note.minLength=10;note.maxLength=1000;note.value=report.review_note||'';noteLabel.append(note);form.append(noteLabel);
    const button=document.createElement('button');button.type='submit';button.className='btn-secondary';button.textContent='Save review';form.append(button);
    const message=document.createElement('div');message.className='review-message';message.setAttribute('role','status');form.append(message);
    form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;message.textContent='Saving…';try{const response=await fetch('/api/reports/'+encodeURIComponent(report.request_id)+'/review',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:select.value,note:note.value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Review failed.');message.textContent='Review saved.';report.review_status=select.value;report.review_note=note.value;window.dispatchEvent(new Event('ias-review-updated'));await load(true);}catch(error){message.textContent=error.message;}finally{button.disabled=false;}});
    card.append(form);return card;
  }
  async function loadSamples(){try{const response=await fetch('/api/samples',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();const ids=new Set(data.reviews.map(r=>r.sample_id));[...sampleSelect.options].forEach(o=>{o.textContent=o.textContent.replace(/ · field verified$/,'')+(ids.has(Number(o.value))?' · field verified':'');});$('sample-review-count').textContent=`${ids.size} of ${sampleSelect.options.length} sample candidates field verified.`;}catch{$('sample-review-count').textContent='Sample review status unavailable.';}}
  async function load(reset=false) {
    if(loading)return;
    if(reset){nextOffset=0;list.replaceChildren();more.hidden=true;}
    if(nextOffset===null)return;
    loading=true;status.textContent='Loading saved reports…';
    try {
      const response=await fetch('/api/reports?offset='+nextOffset,{credentials:'same-origin',cache:'no-store'});
      if(response.status===401){
        status.textContent='Log in as admin to view reports awaiting review.';
        login.hidden=false;refresh.hidden=true;logout.hidden=true;more.hidden=true;samplePanel.hidden=true;list.replaceChildren();return;
      }
      if(!response.ok)throw new Error('Saved reports could not be loaded. Please try again.');
      login.hidden=true;refresh.hidden=false;logout.hidden=false;samplePanel.hidden=false;loadSamples();
      const data=await response.json();
      if(!data.ok || !Array.isArray(data.reports))throw new Error('Saved reports could not be loaded.');
      data.reports.forEach(r=>list.append(item(r)));
      nextOffset=data.nextOffset;
      more.hidden=nextOffset===null;
      status.textContent=list.childElementCount ? `${list.childElementCount} saved report${list.childElementCount===1?'':'s'} shown · review decisions update Insights.` : 'No real reports have been submitted yet.';
    } catch(error){status.textContent=error.message || 'Saved reports could not be loaded.';}
    finally{loading=false;}
  }
  window.loadSubmittedReports=()=>load(true);
  login.addEventListener('submit',async event=>{
    event.preventDefault();loginError.hidden=true;
    const button=login.querySelector('button');button.disabled=true;button.textContent='Logging in…';
    try {
      const response=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:login.elements.username.value,password:login.elements.password.value})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || 'Login failed.');
      login.reset();await load(true);
    } catch(error){login.elements.password.value='';loginError.textContent=error.message || 'Login failed.';loginError.hidden=false;}
    finally{button.disabled=false;button.textContent='Log in as admin';}
  });
  sampleForm.addEventListener('submit',async event=>{event.preventDefault();const button=sampleForm.querySelector('button');button.disabled=true;sampleMessage.textContent='Saving…';try{const response=await fetch('/api/samples',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({sampleId:Number(sampleSelect.value),observedDate:sampleForm.elements.observedDate.value,note:sampleForm.elements.note.value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Verification failed.');sampleMessage.textContent='Field verification recorded.';sampleForm.elements.note.value='';loadSamples();window.dispatchEvent(new Event('ias-review-updated'));}catch(error){sampleMessage.textContent=error.message;}finally{button.disabled=false;}});
  logout.addEventListener('click',async()=>{await fetch('/api/admin/logout',{method:'POST',credentials:'same-origin'});await load(true);});
  refresh.addEventListener('click',()=>load(true));
  more.addEventListener('click',()=>load(false));
  window.addEventListener('ias-report-saved',()=>load(true));
})();
