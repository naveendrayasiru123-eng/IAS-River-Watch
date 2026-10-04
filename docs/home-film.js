(function(){
  const video=document.getElementById('river-film'),play=document.getElementById('film-play');
  const names=['Attanagalu Oya','Kelani Ganga','Kalu Ganga'],keys=['attanagalu','kelani','kalu'];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let chapter=0,manuallyPaused=false;
  function update(){chapter=Math.min(2,Math.floor(video.currentTime/4));document.getElementById('film-basin').textContent=names[chapter];document.querySelectorAll('[data-film]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.film)===chapter)));}
  function sync(){play.textContent=video.paused?'Play animation':'Pause animation';}
  video.addEventListener('timeupdate',update);video.addEventListener('play',sync);video.addEventListener('pause',sync);
  const run=()=>video.play().catch(sync);
  play.onclick=()=>{if(video.paused){manuallyPaused=false;run();}else{manuallyPaused=true;video.pause();}};
  document.querySelectorAll('[data-film]').forEach(b=>b.onclick=()=>{chapter=Number(b.dataset.film);video.currentTime=chapter*4;update();if(!reduced.matches&&!manuallyPaused)run();});
  document.getElementById('film-explore').onclick=()=>{video.pause();showPage('map-page');zoomToBasin(keys[chapter]);};
  video.addEventListener('error',()=>{play.disabled=true;document.querySelector('.film-caption').textContent='Video unavailable. Choose a basin, then select Explore this basin to open its map.';});
  const observer=new IntersectionObserver(entries=>{const visible=entries[0].isIntersecting;if(!visible)video.pause();else if(!reduced.matches&&!manuallyPaused)run();},{threshold:.3});observer.observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  reduced.addEventListener('change',()=>{if(reduced.matches)video.pause();});
})();
