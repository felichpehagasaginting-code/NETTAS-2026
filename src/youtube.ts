let player: YT.Player | null = null;
let apiLoaded = false;
let _playing = false;
let _volume = 40;
let pendingInit: string | null = null;

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
    // If API script already loaded (race condition guard)
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
  container.style.display = 'none';
  document.body.appendChild(container);

  return new Promise((resolve) => {
    player = new YT.Player('youtube-player', {
      videoId,
      height: '0',
      width: '0',
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
          player!.setVolume(_volume);
          resolve();
        },
        onStateChange: (e) => {
          _playing = e.data === YT.PlayerState.PLAYING;
        },
        onError: () => {
          console.warn('YouTube player error — fallback to MP3 BGM');
          destroyYouTube();
        },
      },
    });
  });
}

export function playYouTube(): void {
  if (!player) return;
  player.playVideo();
  _playing = true;
}

export function pauseYouTube(): void {
  if (!player) return;
  player.pauseVideo();
  _playing = false;
}

export function setYouTubeVolume(v: number): void {
  _volume = Math.round(v * 100);
  player?.setVolume(_volume);
}

export function destroyYouTube(): void {
  if (player) {
    player.destroy();
    player = null;
  }
  _playing = false;
  const el = document.getElementById('youtube-player');
  if (el) el.remove();
}

export function youTubeExists(): boolean {
  return player !== null;
}

export function isYouTubePlaying(): boolean {
  return _playing;
}
