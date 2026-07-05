let player: YT.Player | null = null;
let apiLoaded = false;
let _ready = false;
let _playing = false;
let _volume = 40;

function loadAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    (window as any).onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    if (typeof YT !== 'undefined' && YT.Player) {
      apiLoaded = true;
      (window as any).onYouTubeIframeAPIReady?.();
      resolve();
    }
  });
}

export async function initYouTube(videoId: string): Promise<void> {
  destroyYouTube();
  await loadAPI();

  const container = document.createElement('div');
  container.id = 'youtube-player';
  container.style.cssText = 'visibility:hidden;position:absolute;width:0;height:0';
  document.body.appendChild(container);

  return new Promise((resolve) => {
    player = new YT.Player('youtube-player', {
      videoId,
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        loop: 1,
        playlist: videoId,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => {
          _ready = true;
          player!.setVolume(_volume);
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
  if (!player || !_ready) return;
  player.playVideo();
}

export function pauseYouTube(): void {
  if (!player || !_ready) return;
  player.pauseVideo();
}

export function setYouTubeVolume(v: number): void {
  _volume = Math.round(v * 100);
  if (_ready) player?.setVolume(_volume);
}

export function destroyYouTube(): void {
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
