let player: YT.Player | null = null;
let apiLoaded = false;
let _ready = false;
let _playing = false;
let _volume = 40;
let _pendingPlay = false;
let _currentVideoId: string | null = null;

function loadAPI(timeoutMs = 8000): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('YouTube API load timeout')), timeoutMs);
    (window as any).onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      apiLoaded = true;
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    if (typeof YT !== 'undefined' && YT.Player) {
      clearTimeout(timer);
      apiLoaded = true;
      (window as any).onYouTubeIframeAPIReady?.();
      resolve();
    }
  });
}

export async function initYouTube(videoId: string): Promise<void> {
  if (_currentVideoId === videoId && _ready) return;
  destroyYouTube();
  _currentVideoId = videoId;
  try {
    await loadAPI();
  } catch {
    console.warn('YouTube API load failed (timeout/blocked)');
    destroyYouTube();
    return;
  }

  // Position in-viewport at bottom-right — not off-screen (browsers deprioritize off-screen iframes)
  const container = document.createElement('div');
  container.id = 'youtube-player';
  container.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
  document.body.appendChild(container);

  return new Promise((resolve) => {
    player = new YT.Player('youtube-player', {
      videoId,
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        loop: 1,
        playlist: videoId,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          _ready = true;
          if (player) {
            player.setVolume(_volume);
            player.unMute();
          }
          if (_pendingPlay && player) {
            player.playVideo();
            _pendingPlay = false;
          }
          resolve();
        },
        onStateChange: (e) => {
          _playing = e.data === YT.PlayerState.PLAYING;
        },
        onError: () => {
          console.warn('YouTube player error');
          destroyYouTube();
        },
      },
    });
  });
}

export function playYouTube(): void {
  if (!player || !_ready) {
    _pendingPlay = true;
    return;
  }
  player.unMute();
  player.playVideo();
}

export function pauseYouTube(): void {
  _pendingPlay = false;
  if (!player || !_ready) return;
  player.pauseVideo();
}

export function setYouTubeVolume(v: number): void {
  _volume = Math.round(v * 100);
  if (_ready && player) player.setVolume(_volume);
}

export function destroyYouTube(): void {
  _pendingPlay = false;
  _currentVideoId = null;
  if (player) {
    player.destroy();
    player = null;
  }
  _ready = false;
  _playing = false;
  const el = document.getElementById('youtube-player');
  if (el) el.remove();
}

export function youTubeExists(): boolean {
  return player !== null && _ready;
}

export function isYouTubePlaying(): boolean {
  return _playing && _ready;
}
