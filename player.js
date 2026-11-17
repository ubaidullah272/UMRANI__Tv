// Shared player for Live TV, Dramas and Movies.
// YouTube links open inside UMRANI TV using YouTube's official embed player.
(function(){
  const frame = document.getElementById("frame");
  const section = document.getElementById("player");
  let ytPlayer = null;
  let currentVideo = null;

  function youtubeId(url){
    try{
      const u = new URL(url);
      if(u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || "";
      if(u.searchParams.get("v")) return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex(p => ["embed","live","shorts"].includes(p));
      return marker >= 0 ? (parts[marker+1] || "") : "";
    }catch(e){ return ""; }
  }

  function loadYouTubeAPI(){
    if(window.YT && window.YT.Player) return Promise.resolve();
    if(window.__umraniYTReady) return window.__umraniYTReady;
    window.__umraniYTReady = new Promise(resolve => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        if(typeof previous === "function") previous();
        resolve();
      };
      if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
        const s=document.createElement("script");
        s.src="https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    });
    return window.__umraniYTReady;
  }

  window.playVideo = async function(url,name){
    if(!url) return;
    window.closePlayer();
    document.getElementById("playerTitle").textContent=name || "Now Playing";
    section.classList.add("active");
    frame.innerHTML="";
    const id=youtubeId(url);

    if(id){
      const iframe=document.createElement("iframe");
      iframe.id="umraniYoutubePlayer";
      iframe.src="https://www.youtube.com/embed/"+encodeURIComponent(id)+"?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin="+encodeURIComponent(location.origin);
      iframe.title=name || "YouTube video";
      iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen=true;
      frame.appendChild(iframe);
      currentVideo=iframe;
      try{
        await loadYouTubeAPI();
        if(currentVideo===iframe && window.YT && window.YT.Player){
          ytPlayer=new YT.Player(iframe,{
            events:{onReady:function(e){
              const slider=document.querySelector('input[type="range"][min="0"][max="100"]');
              if(slider) e.target.setVolume(Number(slider.value));
            }}
          });
        }
      }catch(e){ /* The embedded video remains usable without the API controls. */ }
    }else{
      const video=document.createElement("video");
      video.controls=true;
      video.autoplay=true;
      video.playsInline=true;
      video.style.width="100%";
      video.style.height="100%";
      video.src=url;
      frame.appendChild(video);
      currentVideo=video;
      video.play().catch(()=>{});
    }
    section.scrollIntoView({behavior:"smooth",block:"center"});
  };

  window.brightness=function(value){
    if(currentVideo) currentVideo.style.filter="brightness("+Number(value)/100+")";
  };
  window.volume=function(value){
    if(ytPlayer && typeof ytPlayer.setVolume==="function") ytPlayer.setVolume(Number(value));
    if(currentVideo && currentVideo.tagName==="VIDEO") currentVideo.volume=Number(value)/100;
    const label=document.getElementById("volumeValue");
    if(label) label.textContent=Number(value)+"%";
  };
  window.fullscreen=function(){
    if(frame.requestFullscreen) frame.requestFullscreen();
    else if(currentVideo && currentVideo.requestFullscreen) currentVideo.requestFullscreen();
  };
  window.closePlayer=function(){
    if(ytPlayer && typeof ytPlayer.destroy==="function"){
      try{ytPlayer.destroy();}catch(e){}
    }
    ytPlayer=null;
    currentVideo=null;
    if(frame) frame.innerHTML="";
    if(section) section.classList.remove("active");
  };
})();