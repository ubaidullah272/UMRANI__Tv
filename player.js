
// UMRANI TV Custom Video Player
(function () {
  const frame = document.getElementById('frame');
  const section = document.getElementById('player');
  if (!frame || !section) return;

  let ytPlayer = null;
  let currentVideo = null;
  let isLocked = false;
  let isRotated = false;

  const style = document.createElement('style');
  style.textContent = `
    #frame{position:relative}
    .umrani-watermark{
      position:absolute;top:12px;right:14px;z-index:20;
      pointer-events:none;padding:6px 10px;
      border:1px solid #00eaff;border-radius:9px;
      background:rgba(0,0,0,.65);color:#00eaff;
      font:bold 14px Arial,sans-serif;letter-spacing:1px;
      text-shadow:0 0 8px #00eaff,0 0 14px #ff00ff;
    }
    .umrani-controls{
      display:flex;flex-wrap:wrap;align-items:center;
      justify-content:center;gap:10px;
    }
    .umrani-controls label{
      display:flex;align-items:center;gap:6px;flex-wrap:wrap;
    }
    .umrani-controls input[type=range]{
      width:100px;max-width:28vw;
    }
    #frame.umrani-rotated{
      transform:rotate(90deg);
      transform-origin:center center;
    }
  `;
  document.head.appendChild(style);

  function youtubeId(url) {
    try {
      const u = new URL(url, location.href);
      if (u.hostname.includes('youtu.be'))
        return u.pathname.split('/').filter(Boolean)[0] || '';
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex(p =>
        ['embed', 'live', 'shorts'].includes(p)
      );
      return marker >= 0 ? (parts[marker + 1] || '') : '';
    } catch (_) {
      return '';
    }
  }

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (window.__umraniYTReady) return window.__umraniYTReady;

    window.__umraniYTReady = new Promise(resolve => {
      const oldCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof oldCallback === 'function') oldCallback();
        resolve();
      };

      if (!document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
    });

    return window.__umraniYTReady;
  }

  function addWatermark() {
    const mark = document.createElement('div');
    mark.className = 'umrani-watermark';
    mark.textContent = '𓆩 UMRANI TV 𖡼';
    mark.setAttribute('aria-hidden', 'true');
    frame.appendChild(mark);
  }

  function buildCustomControls() {
    let controls = section.querySelector('.controls');

    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'controls';
      section.appendChild(controls);
    }

    controls.innerHTML = '';
    controls.classList.add('umrani-controls');

    function makeButton(label, action, title) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn umrani-control';
      button.textContent = label;
      button.title = title;
      button.addEventListener('click', action);
      controls.appendChild(button);
      return button;
    }

    makeButton('▶ / ⏸ Play', togglePlay, 'Play or pause');

    const brightnessLabel = document.createElement('label');
    brightnessLabel.textContent = '☀ Light ';

    const brightnessInput = document.createElement('input');
    brightnessInput.type = 'range';
    brightnessInput.min = '50';
    brightnessInput.max = '150';
    brightnessInput.value = '100';
    brightnessInput.setAttribute('aria-label', 'Brightness');
    brightnessInput.addEventListener('input', () =>
      window.brightness(brightnessInput.value)
    );

    brightnessLabel.appendChild(brightnessInput);
    controls.appendChild(brightnessLabel);

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = '🔊 Volume ';

    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.min = '0';
    volumeInput.max = '100';
    volumeInput.value = '80';
    volumeInput.setAttribute('aria-label', 'Volume');
    volumeInput.addEventListener('input', () =>
      window.volume(volumeInput.value)
    );

    volumeLabel.appendChild(volumeInput);

    const volumeValue = document.createElement('span');
    volumeValue.id = 'volumeValue';
    volumeValue.textContent = '80%';
    volumeLabel.appendChild(volumeValue);
    controls.appendChild(volumeLabel);

    makeButton('🔒 Lock', toggleLock, 'Lock or unlock player controls');
    makeButton('🔄 Rotate', rotatePlayer, 'Rotate video');
    makeButton('⛶ Fullscreen', window.fullscreen, 'Fullscreen');
    makeButton('✕ Close', window.closePlayer, 'Close player');
  }

  function togglePlay() {
    if (isLocked) return;

    if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
      const state = ytPlayer.getPlayerState();
      if (state === 1) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    } else if (currentVideo && currentVideo.tagName === 'VIDEO') {
      if (currentVideo.paused) currentVideo.play().catch(() => {});
      else currentVideo.pause();
    }
  }

  function toggleLock() {
    isLocked = !isLocked;
    const controls = section.querySelector('.controls');

    if (controls) {
      controls.querySelectorAll('button,input').forEach(el => {
        if (el.title !== 'Lock or unlock player controls')
          el.disabled = isLocked;
      });

      const lockButton = Array.from(
        controls.querySelectorAll('button')
      ).find(b => b.title === 'Lock or unlock player controls');

      if (lockButton)
        lockButton.textContent = isLocked ? '🔓 Unlock' : '🔒 Lock';
    }
  }

  async function rotatePlayer() {
    if (isLocked) return;

    isRotated = !isRotated;
    frame.classList.toggle('umrani-rotated', isRotated);

    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock(
          isRotated ? 'landscape' : 'portrait'
        );
      }
    } catch (_) {}
  }

  window.playVideo = async function (url, name) {
    if (!url) return;

    window.closePlayer();

    const title = document.getElementById('playerTitle');
    if (title) title.textContent = name || 'Now Playing';

    section.classList.add('active');
    frame.innerHTML = '';
    isLocked = false;
    isRotated = false;

    buildCustomControls();

    const id = youtubeId(url);

    if (id) {
      const iframe = document.createElement('iframe');
      iframe.id = 'umraniYoutubePlayer';

      iframe.src =
        'https://www.youtube.com/embed/' +
        encodeURIComponent(id) +
        '?autoplay=1&enablejsapi=1&playsinline=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&origin=' +
        encodeURIComponent(location.origin);

      iframe.title = name || 'Video';
      iframe.allow =
        'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;

      frame.appendChild(iframe);
      addWatermark();
      currentVideo = iframe;

      try {
        await loadYouTubeAPI();

        if (currentVideo === iframe && window.YT && window.YT.Player) {
          ytPlayer = new YT.Player(iframe, {
            events: {
              onReady: event => event.target.setVolume(80)
            }
          });
        }
      } catch (_) {}
    } else {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.src = url;

      frame.appendChild(video);
      addWatermark();
      currentVideo = video;
      video.play().catch(() => {});
    }

    section.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  window.brightness = function (value) {
    if (currentVideo)
      currentVideo.style.filter =
        'brightness(' + (Number(value) / 100) + ')';
  };

  window.volume = function (value) {
    const amount = Math.max(0, Math.min(100, Number(value)));

    if (ytPlayer && typeof ytPlayer.setVolume === 'function')
      ytPlayer.setVolume(amount);

    if (currentVideo && currentVideo.tagName === 'VIDEO')
      currentVideo.volume = amount / 100;

    const label = document.getElementById('volumeValue');
    if (label) label.textContent = amount + '%';
  };

  window.fullscreen = function () {
    if (frame.requestFullscreen)
      frame.requestFullscreen().catch(() => {});
    else if (currentVideo && currentVideo.requestFullscreen)
      currentVideo.requestFullscreen().catch(() => {});
  };

  window.closePlayer = function () {
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
      try {
        ytPlayer.destroy();
      } catch (_) {}
    }

    ytPlayer = null;
    currentVideo = null;
    isLocked = false;
    isRotated = false;

    frame.innerHTML = '';
    frame.classList.remove('umrani-rotated');
    section.classList.remove('active');

    if (screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch (_) {}
    }
  };
})();
