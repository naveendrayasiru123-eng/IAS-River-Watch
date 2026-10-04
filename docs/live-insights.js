(function(){
  const $=id=>document.getElementById(id);
  const basins=['Kelani Basin','Kalu Basin','Attanagalu Oya Basin','Not sure'];
  const short={'Kelani Basin':'Kelani','Kalu Basin':'Kalu','Attanagalu Oya Basin':'Attanagalu Oya'};
  const types=[['Aquatic plants','#4db8e8'],['Climbers','#3ecf72'],['Shrubs / trees','#e85d42'],['Unclassified','#f5a623']];
  function plantType(name){const n=String(name||'').toLowerCase();if(/eichhornia|water hyacinth|salvinia|pistia|water lettuce|alternanthera philoxeroides/.test(n))return 'Aquatic plants';if(/mikania/.test(n))return 'Climbers';if(/lantana|ipomoea carnea|prosopis|chromolaena/.test(n))return 'Shrubs / trees';return 'Unclassified';}
  const set=(node,value)=>{node.textContent=value;return node;};
  function element(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=String(text);return node;}
  function metric(label,value,sub){const card=element('div','metric-card');card.append(element('div','metric-label',label),element('div','metric-value',value),element('div','metric-sub',sub));return card;}
  function placeholder(node,message){node.replaceChildren(element('p','insight-note',message));}
  function render(data){
    const observations=[...data.verifiedReports,...data.verifiedSamples];
    $('insights-metrics').replaceChildren(
      metric('Community submissions',data.totalSubmissions,'All saved reports, including pending'),
      metric('Awaiting admin review',data.pendingCount,'Open Observations to review'),
      metric('Verified community reports',data.verifiedReports.length,'Admin-reviewed submissions'),
      metric('Field-verified former samples',data.verifiedSamples.length,`Of ${data.sampleCandidates} synthetic candidates`),
      metric('Verified observations',observations.length,'Evidence-supported locations')
    );
    const basinNode=$('insights-basins');basinNode.replaceChildren();
    basins.forEach(b=>{const count=observations.filter(r=>r.basin===b).length;const percent=observations.length?Math.round(100*count/observations.length):0;const row=element('div','bar-row');row.append(element('span','bar-name',short[b]||b));const track=element('div','bar-track');const fill=element('div','bar-fill');fill.style.width=`${Math.max(count?12:0,percent)}%`;fill.style.background='var(--accent)';if(!count)fill.style.padding='0';else fill.append(element('span','',`${percent}%`));track.append(fill);row.append(track,element('span','insight-count',count));basinNode.append(row);});
    const typeCounts=new Map(types.map(([label])=>[label,0]));observations.forEach(r=>{const type=plantType(r.species);typeCounts.set(type,typeCounts.get(type)+1);});
    const donut=$('insights-type-donut'),legend=$('insights-type-legend');legend.replaceChildren();donut.replaceChildren(element('span','',`${observations.length} records`));
    let start=0;const stops=[];types.forEach(([label,color])=>{const count=typeCounts.get(label);if(!count)return;const end=start+100*count/observations.length;stops.push(`${color} ${start}% ${end}%`);start=end;const row=element('div','donut-legend-item');const dot=element('div','donut-legend-dot');dot.style.background=color;row.append(dot,element('span','',label),element('strong','',count));legend.append(row);});
    donut.style.background=stops.length?`conic-gradient(${stops.join(',')})`:'var(--bg3)';donut.setAttribute('aria-label',observations.length?types.map(([label])=>`${label}: ${typeCounts.get(label)}`).join(', '):'No verified observations');
    const speciesNode=$('insights-species');speciesNode.replaceChildren();
    const counts=new Map();observations.forEach(r=>counts.set(r.species,(counts.get(r.species)||0)+1));
    [...counts].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([species,count],i)=>{const row=element('div','species-rank');row.append(element('span','rank-num',i+1));const info=element('div','rank-info');info.append(element('div','rank-name',species));row.append(info,element('span','rank-count',count));speciesNode.append(row);});
    if(!counts.size)placeholder(speciesNode,'No species can be ranked until observations have been verified.');
    const trend=$('insights-trend');trend.replaceChildren();const maxMonth=Math.max(1,...data.monthlyCounts.map(r=>r.count));data.monthlyCounts.forEach(r=>{const row=element('div','timeline-row');row.append(element('span','timeline-month',r.month));const bar=element('div','timeline-bar'),fill=element('div','timeline-fill');fill.style.width=`${Math.max(12,100*r.count/maxMonth)}%`;fill.append(element('span','',r.count));bar.append(fill);row.append(bar);trend.append(row);});if(!data.monthlyCounts.length)placeholder(trend,'No community submissions recorded yet.');
    const actions=$('insights-actions');actions.replaceChildren();
    function action(title,detail){const card=element('div','insight-entry');card.append(element('strong','',title),element('p','',detail));actions.append(card);}
    if(data.pendingCount)action('Review incoming evidence',`${data.pendingCount} submission${data.pendingCount===1?'':'s'} await admin review. Check species, coordinates, image if supplied, and the observation details before verification.`);
    if(!observations.length)action('Start field validation','No observations are verified yet. Select sample candidates for field visits and review incoming reports before drawing ecological conclusions.');
    else {
      const sorted=basins.map(b=>[b,observations.filter(r=>r.basin===b).length]).sort((a,b)=>b[1]-a[1]);
      const [basin,count]=sorted[0];if(count)action('Plan a follow-up survey',`${count} verified observation${count===1?' is':'s are'} recorded in ${basin}. Inspect their locations and revisit nearby stream reaches; count alone is not a basin risk score.`);
      const [species,n]=[...counts].sort((a,b)=>b[1]-a[1])[0]||[];if(n>1)action('Check repeated species records',`${species} appears in ${n} verified observations. Check for duplicate locations and assess spread on site before choosing a control action.`);
    }
    if(data.verifiedSamples.length)action('Keep sample provenance visible',`${data.verifiedSamples.length} former sample candidate${data.verifiedSamples.length===1?' has':'s have'} a recorded field check. The other ${data.sampleCandidates-data.verifiedSamples.length} remain synthetic and excluded.`);
    const register=$('insights-observations');register.replaceChildren();
    observations.sort((a,b)=>String(b.verifiedAt).localeCompare(String(a.verifiedAt))).slice(0,50).forEach(r=>{const card=element('article','insight-entry');card.append(element('strong','',`${r.species} · ${short[r.basin]||r.basin}`));card.append(element('p','',`${r.source} · observed ${r.observedDate} · ${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}`));const button=element('button','','View on map →');button.type='button';button.addEventListener('click',()=>window.viewOnMap(Number(r.latitude),Number(r.longitude)));card.append(button);register.append(card);});
    if(!observations.length)placeholder(register,'No verified observations yet. Pending reports and synthetic samples are excluded.');
    $('insights-status').textContent=`Updated ${new Date(data.updatedAt).toLocaleString('en-LK',{timeZone:'Asia/Colombo',dateStyle:'medium',timeStyle:'short'})} (Sri Lanka). Verified records appear after admin review.`;
  }
  let loading=false;
  async function load(){if(loading)return;loading=true;$('insights-status').textContent='Loading reviewed observations…';try{const response=await fetch('/api/insights',{cache:'no-store'});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Insights unavailable.');render(data);}catch(error){$('insights-status').textContent=error.message||'Insights unavailable.';}finally{loading=false;}}
  window.loadInsights=load;
  window.addEventListener('ias-review-updated',load);
  window.addEventListener('ias-report-saved',load);
})();
