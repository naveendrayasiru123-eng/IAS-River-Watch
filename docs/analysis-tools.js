/* Evidence-aware point-density exploration. No observations are inferred. */
(function(){
  'use strict';
  const state={mode:'heat',species:'',basins:new Set(['kelani','kalu','attanagalu'])};
  let heat, initialized=false;
  const names={kelani:'Kelani Ganga',kalu:'Kalu Ganga',attanagalu:'Attanagalu Oya'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selected=()=>communityReports.filter(r=>state.basins.has(r.basinKey)&&(!state.species||r.sci===state.species)&&Number.isFinite(r.lat)&&Number.isFinite(r.lng));
  const originalInit=initMainMap;
  initMainMap=function(){originalInit();setup();};
  function setup(){
    if(initialized)return;initialized=true;
    const section=document.createElement('section');section.className='sidebar-section';
    section.innerHTML=`<h3>Stream-network sample density</h3>
      <label for="density-mode">Display</label><select id="density-mode"><option value="points">Small points</option><option value="heat" selected>Hotspot contours</option><option value="both">Points + contours</option></select>
      <label for="density-species">Species label</label><select id="density-species"><option value="">All species labels</option>${[...new Set(communityReports.map(r=>r.sci))].sort().map(s=>`<option>${esc(s)}</option>`).join('')}</select>
      <div style="height:10px;border-radius:8px;background:linear-gradient(90deg,#fff0f0,#fda4af,#fb7185,#ef4444,#b91c1c)"></div><p style="display:flex;justify-content:space-between"><span>Lower concentration</span><span>Higher</span></p>
      <p class="data-note">Dummy sample density — not measured IAS abundance or confirmed infestation. Fixed 850 m geographic smoothing with five density bands; shapes stay in place when zooming. Colour is relative, not plants/km². No points does not mean no IAS. Contours may extend beyond streams and basin edges; they do not represent infestation boundaries.</p>
      <p id="density-count" role="status" aria-live="polite"></p><div id="density-bars"></div>
      <button class="map-tool" id="density-fit">Fit filtered points</button> <button class="map-tool" id="density-export">Export GeoJSON</button>
      <p id="density-error" role="alert"></p>
      <details><summary>Method & sources</summary><p>Equal-weight Gaussian density, calculated on a 200 m grid with 850 m bandwidth. Five bands show 3.5–10%, 10–22%, 22–40%, 40–65% and 65–100% of the peak for the selected species across all three basins. Basin filtering preserves those thresholds. Samples are deliberately clustered unevenly along supplied stream lines for demonstration only. <a href="https://www.gbif.org/data-use/6hL40kh9ikDXftobIM85KP/sampling-biases-shape-our-view-of-the-natural-world" target="_blank" rel="noopener">GBIF explains sampling bias</a>; concentration alone is not an infestation-risk score. Basin bars count the current filtered records, not invasion severity.</p></details>`;
    const sidebar=document.querySelector('.map-sidebar');sidebar.insertBefore(section,sidebar.querySelector('.map-tools').nextSibling);
    section.querySelectorAll('label').forEach(e=>{e.style.display='block';e.style.marginTop='12px';});
    section.querySelectorAll('p,summary').forEach(e=>{e.style.fontSize='14px';e.style.marginTop='10px';});
    document.getElementById('density-mode').onchange=e=>{state.mode=e.target.value;refresh();};
    document.getElementById('density-species').onchange=e=>{state.species=e.target.value;refresh();};
    document.getElementById('density-fit').onclick=()=>{const rows=selected();if(rows.length)mainMap.fitBounds(L.latLngBounds(rows.map(r=>[r.lat,r.lng])),{paddingTopLeft:[30,70],paddingBottomRight:[380,40],maxZoom:14});};
    document.getElementById('density-export').onclick=()=>{
      const data={type:'FeatureCollection',description:'Unverified point dataset; not confirmed IAS presence. Filtered export.',features:selected().map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[r.lng,r.lat]},properties:{...r,evidenceStatus:r.status||'Unverified',densityMethod:'fixed 850 m geographic KDE'}}))};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/geo+json'}));const a=document.createElement('a');a.href=url;a.download='ias-unverified-filtered-points.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const legend=L.control({position:'bottomleft'});
    legend.onAdd=function(){
      const box=L.DomUtil.create('div','sample-density-legend');
      box.style.cssText='background:rgba(255,255,255,.95);color:#3f1520;padding:12px 14px;border-radius:10px;max-width:250px;box-shadow:0 2px 12px #0002;font:14px/1.4 sans-serif';
      box.innerHTML='<strong>Sample hotspot contours</strong><div style="height:9px;margin:8px 0;background:linear-gradient(90deg,#fff0f0,#fda4af,#fb7185,#ef4444,#b91c1c)"></div><div style="display:flex;justify-content:space-between"><span>Lower</span><span>Higher</span></div><div style="margin-top:6px">Fixed geographic density bands.<br>Dummy data · not confirmed IAS.</div>';
      L.DomEvent.disableClickPropagation(box);return box;
    };legend.addTo(mainMap);
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(mainMap);
    setBasemap('osm');
    refresh();
  }
  function refresh(){
    const rows=selected();
    const legend=document.querySelector('.sample-density-legend');if(legend)legend.style.display=state.mode==='points'?'none':'block';
    layers.community.clearLayers();
    rows.forEach(r=>layers.community.addLayer(L.circleMarker([r.lat,r.lng],{radius:3,color:'#fff',weight:.7,fillColor:'#ffb84d',fillOpacity:.95}).bindPopup(`<h4>${esc(r.common)}</h4><p>${esc(r.sci)}</p><p>${esc(r.basin)}</p><p>${esc(r.status||'Unverified')} · ${esc(r.date)}</p><p>Coordinates: ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}</p><p>${esc(r.notes)}</p>`)));
    if(heat)mainMap.removeLayer(heat);
    document.getElementById('density-error').textContent='';
    if(state.mode!=='points'){
      const contours=window.DENSITY_CONTOURS?.[state.species];
      if(contours){
        const colors=['#fbc7ce','#f59ba7','#ec6a7e','#dc3c55','#b90d30'];
        heat=L.geoJSON(contours,{
          filter:f=>state.basins.has(f.properties.basin),
          style:f=>({color:colors[f.properties.band],weight:1.2,opacity:.85,fillColor:colors[f.properties.band],fillOpacity:.58}),
          interactive:false
        }).addTo(mainMap);
      } else document.getElementById('density-error').textContent='Contours unavailable. Showing sample points.';
    }
    const pointsVisible=state.mode!=='heat'||!window.DENSITY_CONTOURS?.[state.species];
    function soften(layer,isBasin){
      if(layer.eachLayer){layer.eachLayer(child=>soften(child,isBasin));return;}
      if(!layer.setStyle)return;
      if(!layer._densityOriginalStyle)layer._densityOriginalStyle={color:layer.options.color,weight:layer.options.weight,opacity:layer.options.opacity,fillOpacity:layer.options.fillOpacity};
      layer.setStyle(state.mode==='points'?layer._densityOriginalStyle:(isBasin?{weight:.7,opacity:.38,fillOpacity:.015}:{weight:1.25,opacity:.85,lineCap:'round',lineJoin:'round'}));
    }
    ['rivers','basins','attanagalu-uploaded-streams','kelani-natural-streams','kalu-natural-streams'].forEach(k=>{if(layers[k])soften(layers[k],k==='basins');});
    ['attanagalu-uploaded-streams','kelani-natural-streams','kalu-natural-streams'].forEach(k=>{if(layers[k]?.bringToFront)layers[k].bringToFront();});
    const intro=document.querySelector('.map-intro-card');if(intro)intro.style.display=state.mode==='points'?'':'none';
    if(pointsVisible)layers.community.addTo(mainMap);else mainMap.removeLayer(layers.community);
    const check=document.querySelector('input[onchange*="toggleLayer(\'community\'"]');if(check)check.checked=pointsVisible;
    document.getElementById('density-count').textContent=rows.length?`${rows.length} of ${communityReports.length} records selected · dummy samples`:'No matching records. Change the basin or species filter.';
    document.getElementById('density-bars').innerHTML=Object.entries(names).map(([k,n])=>{const count=rows.filter(r=>r.basinKey===k).length;return `<p>${n}: <strong>${count}</strong></p><div style="height:7px;background:#18392e;border-radius:4px"><div style="height:100%;background:#35e59b;width:${100*count/Math.max(rows.length,1)}%;border-radius:4px"></div></div>`;}).join('');
  }
  filterBasin=function(key,visible){if(visible)state.basins.add(key);else state.basins.delete(key);if(initialized)refresh();};
  // Replace tile layers as a mutually exclusive set, including original local handles.
  setBasemap=function(type){
    if(!mainMap)return;
    mainMap.eachLayer(layer=>{if(layer instanceof L.TileLayer)mainMap.removeLayer(layer);});
    const satellite=type==='satellite';
    L.tileLayer(satellite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:satellite?'Imagery © Esri and contributors':'© OpenStreetMap contributors'}).addTo(mainMap);
    ['sat','osm'].forEach(k=>{const b=document.getElementById('btn-'+k);const active=(k==='sat')===satellite;b.setAttribute('aria-pressed',String(active));b.style.background=active?'rgba(53,229,155,.18)':'var(--bg3)';b.style.color=active?'var(--accent)':'var(--text2)';b.style.borderColor=active?'var(--accent)':'var(--border)';});
  };
  const originalMode=setAnalysisMode;
  setAnalysisMode=function(mode){originalMode(mode);if(initialized)refresh();};
  if(window.mainMap)setup();
})();
