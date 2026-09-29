(function () {
  const $=id=>document.getElementById(id);
  const status=$('report-status'),button=$('load-google-report');
  let selected=null;
  function readLocation(){
    const a=$('inp-lat').value.trim(),b=$('inp-lng').value.trim();
    if(!a||!b||!Number.isFinite(+a)||!Number.isFinite(+b)||Math.abs(+a)>90||Math.abs(+b)>180)return null;
    return (+a).toFixed(5)+', '+(+b).toFixed(5);
  }
  function formUrl(location){
    const url=new URL('https://docs.google.com/forms/d/e/1FAIpQLSf8QkDtR73y2gf7yGWMGrNI9h99Em55OmfHfocRBoeejaSfcA/viewform');
    url.searchParams.set('usp','pp_url');url.searchParams.set('entry.1646190945',location);
    return url;
  }
  function applyLocation(automatic=false){
    const location=readLocation();
    if(!location){if(!automatic){status.textContent='Choose the plant’s location on the map or enter valid latitude and longitude.';$('inp-lat').focus();}return;}
    if(selected===location){if(!automatic)$('google-report-frame').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(selected&&automatic){status.textContent='Location changed to '+location+'. Choose “Use selected location in form” to update the form; unsent answers will be reset.';return;}
    if(selected&&!window.confirm('Loading a different location will reset any unsent answers in the form. Continue?'))return;
    const url=formUrl(location);
    $('google-report-external').href=url.href;
    url.searchParams.set('embedded','true');$('google-report-frame').src=url.href;
    selected=location;
    status.textContent='Location prefilled: '+location+'. Complete the questions and press Submit inside the Google Form.';
    button.textContent='Update location in form';
  }
  button.addEventListener('click',()=>applyLocation(false));
  document.addEventListener('ias-location-selected',()=>{
    const location=readLocation();
    if(location)$('google-report-external').href=formUrl(location).href;
    if(!selected)applyLocation(true);
    else if(location!==selected)status.textContent='The map pin changed. Update the form before submitting if this is the sighting location.';
  });
  ['inp-lat','inp-lng'].forEach(id=>$(id).addEventListener('input',()=>{
    if(selected)status.textContent='Location edited. The open form still uses '+selected+'. Apply the new location before entering your answers.';
  }));
})();
