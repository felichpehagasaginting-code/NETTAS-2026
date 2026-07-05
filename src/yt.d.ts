declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    destroy(): void;
    setVolume(volume: number): void;
    unMute(): void;
    mute(): void;
    isMuted(): boolean;
    getCurrentTime(): number;
  }
  interface PlayerOptions {
    videoId: string;
    height?: string | number;
    width?: string | number;
    playerVars?: PlayerVars;
    events?: Events;
  }
  interface PlayerVars {
    autoplay?: number;
    controls?: number;
    modestbranding?: number;
    loop?: number;
    playlist?: string;
    rel?: number;
    showinfo?: number;
    iv_load_policy?: number;
    playsinline?: number;
  }
  interface Events {
    onReady?: (event: { target: Player }) => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  }
  enum PlayerState {
    BUFFERING = 3,
    CUED = 5,
    ENDED = 0,
    PAUSED = 2,
    PLAYING = 1,
    UNSTARTED = -1,
  }
}
