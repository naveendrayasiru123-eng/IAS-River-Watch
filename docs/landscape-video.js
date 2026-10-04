(function(){
 const video=document.getElementById('landscape-video'),home=document.getElementById('home');
 if(!video||!home)return;
 video.muted=true;video.defaultMuted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.controls=false;
 function play(){if(home.classList.contains('active')&&!document.hidden){const result=video.play();if(result&&result.catch)result.catch(()=>{});}}
 video.addEventListener('canplay',play);
 new MutationObserver(()=>{if(home.classList.contains('active'))play();else video.pause();}).observe(home,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else play();});
 // Retry after a normal interaction if browser autoplay policy initially blocks it.
 document.addEventListener('pointerdown',play,{passive:true});
 document.addEventListener('keydown',play);
 play();
})();
