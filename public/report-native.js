(function () {
  const $ = id => document.getElementById(id);
  const endpoint = window.IAS_REPORT_ENDPOINT || '';
  const form = $('ias-report-fields'), button = $('send-ias-report'), status = $('report-status');
  let photo = null, photoUrl = null, busy = false, requestId = crypto.randomUUID();
  $('inp-date').value = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  $('inp-date').max = $('inp-date').value;
  button.disabled = !endpoint;
  status.textContent = endpoint ? 'Submit here after checking your location and observation.' : 'Online submission is not connected yet. You can complete these fields and download your report, including its photograph. Nothing is sent to Google.';
  const tell = message => { status.textContent = message; };
  function coordinates() {
    const a=$('inp-lat').value.trim(), b=$('inp-lng').value.trim();
    if(!a || !b || !Number.isFinite(+a) || !Number.isFinite(+b) || Math.abs(+a)>90 || Math.abs(+b)>180) throw new Error('Choose a location on the map or enter valid coordinates.');
    return {latitude:+a, longitude:+b};
  }
  function payload() {
    if(!form.reportValidity()) return null;
    return {requestId, ...coordinates(), species:$('inp-species').value, basin:$('inp-basin').value,
      observedDate:$('inp-date').value, abundance:$('inp-abundance').value, habitat:$('inp-habitat').value,
      degradation:$('inp-degradation').value, notes:$('inp-notes').value.trim(), photo};
  }
  $('inp-photo').addEventListener('change', async event => {
    photo=null; if(photoUrl) URL.revokeObjectURL(photoUrl);
    $('report-photo-preview').hidden=true; $('photo-info').textContent='';
    const file=event.target.files[0]; if(!file) return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024) {
      event.target.value=''; $('photo-info').textContent='Choose a JPG, PNG or WebP photograph up to 5 MB.';return;
    }
    busy=true; $('download-ias-report').disabled=true; button.disabled=true;
    try {
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this photograph.'));reader.readAsDataURL(file);});
      photo={name:file.name,mimeType:file.type,base64:data.split(',')[1]};
      photoUrl=URL.createObjectURL(file); $('report-photo-preview').src=photoUrl; $('report-photo-preview').hidden=false;
      $('photo-info').textContent=file.name+' · '+(file.size/1024/1024).toFixed(1)+' MB';
    } catch(error) { tell(error.message); event.target.value=''; }
    finally {busy=false;button.disabled=!endpoint;$('download-ias-report').disabled=false;}
  });
  $('download-ias-report').addEventListener('click',()=>{
    try {
      const report=payload();if(!report || busy)return;
      const blob=new Blob([JSON.stringify({...report,status:'Local draft — not submitted'},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='IAS-report-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      tell('Draft downloaded to your device. This is not a submitted report.');
    } catch(error) {tell(error.message);}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if(!endpoint){tell('Google storage is not connected yet. Your report has not been submitted.');return;}
    let report;try{report=payload();if(!report)return;}catch(error){tell(error.message);return;}
    busy=true;button.disabled=true;button.textContent='Saving report…';tell('Waiting for storage confirmation. Keep this page open.');
    try {
      const response=await window.IAS_API.fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(report),signal:AbortSignal.timeout(60000)});
      if(!response.ok)throw new Error('Storage did not confirm your report. Please try again.');
      const result=await window.IAS_API.json(response);
      if(result.ok!==true || result.requestId!==requestId)throw new Error(result.error || 'Storage did not confirm your report.');
      const banner=$('success-banner');banner.replaceChildren();const h=document.createElement('h3');h.textContent='Report saved';const p=document.createElement('p');p.textContent='Reference: '+result.requestId+'. Your observation is pending review.';banner.append(h,p);banner.style.display='block';
      tell('Your report has been saved to the project records.');requestId=crypto.randomUUID();form.reset();photo=null;$('report-photo-preview').hidden=true;$('photo-info').textContent='';
      window.dispatchEvent(new Event('ias-report-saved'));
    }catch(error){tell(error.name==='TimeoutError'?'No confirmation received. Retry without changing the report to avoid duplicates, or download your draft.':error.message);}
    finally{busy=false;button.disabled=false;button.textContent='Submit report';}
  });
})();
