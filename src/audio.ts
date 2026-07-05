import { state } from './firebase';
import { DEFAULT_BGM_INSTRUMENTAL, DEFAULT_BGM_VICTORY } from './config';
import { youTubeExists, isYouTubePlaying, playYouTube, pauseYouTube, setYouTubeVolume } from './youtube';

export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

let _musicEnabled = false;
export function isMusicEnabled(): boolean { return _musicEnabled; }

export const bgMusic = new Audio(DEFAULT_BGM_INSTRUMENTAL);
bgMusic.loop = true;
bgMusic.volume = 0.75;
bgMusic.crossOrigin = 'anonymous';

export const victoryMusic = new Audio(DEFAULT_BGM_VICTORY);
victoryMusic.loop = true;
victoryMusic.volume = 0; // Starts silent for a smooth fade-in
victoryMusic.crossOrigin = 'anonymous';

// ─── Pre-cached audio buffers ────────────────────────────────────────────────
// Generate once on startup to avoid heavy per-tap allocations that cause GC spikes.

let _cachedNoiseBuffer: AudioBuffer | null = null;
let _cachedReverbBuffer: AudioBuffer | null = null;

function getNoiseBuffer(): AudioBuffer {
  if (_cachedNoiseBuffer) return _cachedNoiseBuffer;
  const bufferSize = Math.ceil(audioCtx.sampleRate * 0.008);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  _cachedNoiseBuffer = buffer;
  return buffer;
}

function getReverbBuffer(): AudioBuffer {
  if (_cachedReverbBuffer) return _cachedReverbBuffer;
  const reverbLen = Math.ceil(audioCtx.sampleRate * 0.12);
  const reverbBuffer = audioCtx.createBuffer(2, reverbLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = reverbBuffer.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - i / reverbLen);
    }
  }
  _cachedReverbBuffer = reverbBuffer;
  return reverbBuffer;
}

// ─── Visualizer ──────────────────────────────────────────────────────────────

let analyser: AnalyserNode | null = null;
let sourceBg: MediaElementAudioSourceNode | null = null;
let sourceVictory: MediaElementAudioSourceNode | null = null;
let visualizerInited = false;
let victoryFireworksIntervalId: ReturnType<typeof setInterval> | null = null;

const vCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
const vCtx = vCanvas?.getContext('2d');

// Persistent typed array — allocated once, reused every frame (avoids 60 GC/s)
let _vizDataArray: Uint8Array<ArrayBuffer> | null = null;
let _vizLastWidth = 0;

export function initVisualizer(): void {
  if (!audioCtx || !vCanvas || !vCtx) return;
  
  // Connect both audio elements to the same analyser so the visualizer works in both phases!
  sourceBg = audioCtx.createMediaElementSource(bgMusic);
  sourceVictory = audioCtx.createMediaElementSource(victoryMusic);
  
  analyser = audioCtx.createAnalyser();
  sourceBg.connect(analyser);
  sourceVictory.connect(analyser);
  
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;
  _vizDataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  visualizerInited = true;
  drawVisualizer();
}

function drawVisualizer(): void {
  requestAnimationFrame(drawVisualizer);
  if (!analyser || !vCanvas || !vCtx || !_vizDataArray) return;

  // Guard: only update canvas dimensions when the actual viewport width changes —
  // previously this triggered a full layout recalculation on every single frame.
  const currentWidth = window.innerWidth;
  if (currentWidth !== _vizLastWidth) {
    vCanvas.width = currentWidth;
    vCanvas.height = 100;
    _vizLastWidth = currentWidth;
  }

  analyser.getByteFrequencyData(_vizDataArray);
  vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

  const bufferLength = _vizDataArray.length;
  const barWidth = (vCanvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = _vizDataArray[i] / 2;
    // Pre-compute opacity once per bar — avoid template-literal string construction in tight loop
    const alpha = barHeight / 100;
    vCtx.fillStyle = `rgba(191,0,255,${alpha.toFixed(2)})`;
    vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

// ─── Audio control ───────────────────────────────────────────────────────────

export function resumeAudio(): void {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Helper to fade out an audio track smoothly
export function fadeOut(audio: HTMLAudioElement, durationMs: number, callback?: () => void): void {
  const steps = 25;
  const intervalTime = durationMs / steps;
  const startVolume = audio.volume;
  const volStep = startVolume / steps;
  
  let currentStep = 0;
  const timer = setInterval(() => {
    currentStep++;
    const nextVol = Math.max(0, startVolume - (volStep * currentStep));
    audio.volume = nextVol;
    
    if (currentStep >= steps || nextVol <= 0) {
      clearInterval(timer);
      audio.volume = 0;
      if (callback) callback();
    }
  }, intervalTime);
}

// Helper to fade in an audio track smoothly
export function fadeIn(audio: HTMLAudioElement, durationMs: number, targetVolume: number, callback?: () => void): void {
  audio.volume = 0;
  const steps = 25;
  const intervalTime = durationMs / steps;
  const volStep = targetVolume / steps;
  
  let currentStep = 0;
  const timer = setInterval(() => {
    currentStep++;
    const nextVol = Math.min(targetVolume, volStep * currentStep);
    audio.volume = nextVol;
    
    if (currentStep >= steps || nextVol >= targetVolume) {
      clearInterval(timer);
      audio.volume = targetVolume;
      if (callback) callback();
    }
  }, intervalTime);
}

export function playVictoryAnthem(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!visualizerInited) initVisualizer();

  // Pause YouTube player if active
  if (youTubeExists()) pauseYouTube();

  // 1. Smoothly fade out BGM instrumental over 2 seconds
  fadeOut(bgMusic, 2000, () => {
    bgMusic.pause();
  });

  // 2. Start victory anthem after 1 second, fading in over 1.5 seconds
  setTimeout(() => {
    victoryMusic.volume = 0;
    victoryMusic.currentTime = 0;
    victoryMusic.play().catch((e) => console.warn('Victory music autoplay failed:', e));
    fadeIn(victoryMusic, 1500, 0.85);
    
    // Start triggering synthesized firework sounds!
    startVictoryFireworksSFX();
  }, 1000);
}

function updateMusicStatus(status: string): void {
  const el = document.getElementById('admin-music-status') || document.getElementById('music-status');
  if (el) el.innerText = status;
}

export function toggleMusic(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!visualizerInited) initVisualizer();

  const isVictory = state.isFinished;

  if (isVictory) {
    const otherMusic = bgMusic;
    otherMusic.pause();
    if (victoryMusic.paused) {
      victoryMusic.play().catch((e) => console.error('Victory audio play failed:', e));
      updateMusicStatus('ON');
      victoryMusic.volume = 0.85;
      _musicEnabled = true;
    } else {
      victoryMusic.pause();
      _musicEnabled = false;
      updateMusicStatus('OFF');
    }
    return;
  }

  // Normal mode — check YouTube player first
  if (youTubeExists()) {
    bgMusic.pause();
    if (isYouTubePlaying()) {
      pauseYouTube();
      _musicEnabled = false;
      updateMusicStatus('OFF');
    } else {
      setYouTubeVolume(0.4);
      playYouTube();
      _musicEnabled = true;
      updateMusicStatus('ON');
    }
    return;
  }

  if (bgMusic.paused) {
    bgMusic.play().catch((e) => console.error('Audio play failed:', e));
    _musicEnabled = true;
    updateMusicStatus('ON');
    bgMusic.volume = 0.75;
  } else {
    bgMusic.pause();
    _musicEnabled = false;
    updateMusicStatus('OFF');
  }
}

// ─── Tap sound (optimized) ────────────────────────────────────────────────────
// Critical hot path: called on every user tap. All heavy buffer allocations are
// now replaced with references to pre-cached buffers above.

export function playTapSound(clientX?: number, _clientY?: number): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const progress = state.currentProgressPercentage / 100;
  const panValue = clientX ? ((clientX / window.innerWidth) * 2 - 1) * 0.6 : 0;
  
  // Blue Switch clicky profile frequency calculation based on progress
  const clickFreq = 2200 + progress * 2000;
  const clackFreq = 450 + progress * 450;
  const bottomFreq = 130 + progress * 130;

  const now = audioCtx.currentTime;

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.95, now);

  const panner = audioCtx.createStereoPanner();
  panner.pan.setValueAtTime(panValue, now);
  masterGain.connect(panner);
  panner.connect(audioCtx.destination);

  // 1. Click Jacket Snap (Metallic Click - High Frequency Resonant Transient)
  const oscClick = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  const clickFilter = audioCtx.createBiquadFilter();

  oscClick.type = 'triangle';
  oscClick.frequency.setValueAtTime(clickFreq, now);
  oscClick.frequency.exponentialRampToValueAtTime(clickFreq * 1.1, now + 0.005);

  clickFilter.type = 'bandpass';
  clickFilter.frequency.setValueAtTime(clickFreq, now);
  clickFilter.Q.setValueAtTime(12, now);

  clickGain.gain.setValueAtTime(0.45, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

  oscClick.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(masterGain);

  // 2. High Frequency Crisp Noise Transient (Tactile snap feel)
  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  
  noise.buffer = getNoiseBuffer(); // Cached, zero allocation
  
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(clickFreq * 0.95, now);
  noiseFilter.Q.setValueAtTime(3.0, now);
  
  noiseGain.gain.setValueAtTime(0.18, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  // 3. Plastic Clack (Triangle wave - stem bottom-out)
  const oscClack = audioCtx.createOscillator();
  const clackGain = audioCtx.createGain();
  const clackFilter = audioCtx.createBiquadFilter();
  
  oscClack.type = 'triangle';
  oscClack.frequency.setValueAtTime(clackFreq, now);
  oscClack.frequency.exponentialRampToValueAtTime(clackFreq * 0.85, now + 0.015);
  
  clackFilter.type = 'lowpass';
  clackFilter.frequency.setValueAtTime(clackFreq * 2.0, now);
  clackFilter.Q.setValueAtTime(1.5, now);
  
  clackGain.gain.setValueAtTime(0.25, now);
  clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
  
  oscClack.connect(clackFilter);
  clackFilter.connect(clackGain);
  clackGain.connect(masterGain);

  // 4. Housing Bottom-Out (Sine wave - deep wood/plate thock resonance)
  const oscBottom = audioCtx.createOscillator();
  const bottomGain = audioCtx.createGain();
  
  oscBottom.type = 'sine';
  oscBottom.frequency.setValueAtTime(bottomFreq, now);
  oscBottom.frequency.exponentialRampToValueAtTime(bottomFreq * 0.7, now + 0.035);
  
  bottomGain.gain.setValueAtTime(0.15, now);
  bottomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
  
  oscBottom.connect(bottomGain);
  bottomGain.connect(masterGain);

  // Start & Stop
  noise.start(now);
  oscClick.start(now);
  oscClack.start(now);
  oscBottom.start(now);
  
  oscClick.stop(now + 0.01);
  oscClack.stop(now + 0.025);
  oscBottom.stop(now + 0.045);
}

// ─── Milestone / success sounds ───────────────────────────────────────────────

export function playMilestoneSound(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [261.63, 329.63, 392.0, 523.25];
  const now = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
    panner.pan.setValueAtTime(Math.sin(i * 1.5) * 0.5, now + i * 0.12);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}

export function playSuccessSound(): void {
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  const now = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
    panner.pan.setValueAtTime(Math.sin(i * 0.8) * 0.7, now + i * 0.1);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.5);
  });
}

export function playPartyHorn(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const panner = audioCtx.createStereoPanner();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  panner.pan.setValueAtTime(Math.random() * 0.8 - 0.4, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.8);
}

// ─── Synthesized Firework Sound Effect (Offline, Low-latency, Dynamic) ────────
export function playSynthesizedFirework(panValue: number = 0): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.85 + Math.random() * 0.15, now); // Randomize volume slightly
  
  const panner = audioCtx.createStereoPanner();
  panner.pan.setValueAtTime(panValue, now);
  masterGain.connect(panner);
  panner.connect(audioCtx.destination);

  // 1. The Boom (Deep low-frequency explosion thump)
  const oscBoom = audioCtx.createOscillator();
  const boomGain = audioCtx.createGain();
  
  oscBoom.type = 'triangle';
  oscBoom.frequency.setValueAtTime(100 + Math.random() * 50, now); // Pitch variation
  oscBoom.frequency.exponentialRampToValueAtTime(10, now + 0.25);
  
  boomGain.gain.setValueAtTime(0.9, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  
  oscBoom.connect(boomGain);
  boomGain.connect(masterGain);
  oscBoom.start(now);
  oscBoom.stop(now + 0.35);

  // 2. The Crackle / Sparkles (Filter-swept white noise)
  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  
  noise.buffer = getNoiseBuffer();
  noise.loop = true;
  
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 600, now);
  noiseFilter.Q.setValueAtTime(5, now);
  
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7 + Math.random() * 0.4);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);
  noise.stop(now + 1.2);
}

function startVictoryFireworksSFX(): void {
  if (victoryFireworksIntervalId) clearInterval(victoryFireworksIntervalId);
  
  // Play initial explosion
  playSynthesizedFirework(0);
  
  // Continuous randomized fireworks show!
  victoryFireworksIntervalId = setInterval(() => {
    if (!state.isFinished) {
      stopVictoryFireworksSFX();
      return;
    }
    const pan = Math.random() * 1.6 - 0.8;
    playSynthesizedFirework(pan);
  }, 400 + Math.random() * 400); // Trigger every 400ms - 800ms
}

export function stopVictoryFireworksSFX(): void {
  if (victoryFireworksIntervalId) {
    clearInterval(victoryFireworksIntervalId);
    victoryFireworksIntervalId = null;
  }
}

export function resetAudioState(): void {
  stopVictoryFireworksSFX();
  victoryMusic.pause();
  victoryMusic.currentTime = 0;
  
  if (_musicEnabled) {
    bgMusic.volume = 0.75;
    bgMusic.currentTime = 0;
    bgMusic.play().catch((e) => console.warn('BGM resume failed:', e));
    updateMusicStatus('ON');
  } else {
    bgMusic.pause();
    updateMusicStatus('OFF');
  }
}
