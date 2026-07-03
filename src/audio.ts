import { state } from './firebase';
import { PENTATONIC_SCALE } from './config';

export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export let bgMusic = new Audio(
  'https://cdn.pixabay.com/audio/2022/03/24/audio_7306283b27.mp3',
);
bgMusic.loop = true;
bgMusic.volume = 0.4;
bgMusic.crossOrigin = 'anonymous';

let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let visualizerInited = false;

const vCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
const vCtx = vCanvas?.getContext('2d');

export function initVisualizer(): void {
  if (!audioCtx || !vCanvas || !vCtx) return;
  source = audioCtx.createMediaElementSource(bgMusic);
  analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;
  visualizerInited = true;
  drawVisualizer();
}

function drawVisualizer(): void {
  requestAnimationFrame(drawVisualizer);
  if (!analyser || !vCanvas || !vCtx) return;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  vCanvas.width = window.innerWidth;
  vCanvas.height = 100;
  vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

  const barWidth = (vCanvas.width / bufferLength) * 2.5;
  let barHeight: number;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] / 2;
    vCtx.fillStyle = `rgba(191, 0, 255, ${barHeight / 100})`;
    vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

export function resumeAudio(): void {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function toggleMusic(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!visualizerInited) initVisualizer();

  if (bgMusic.paused) {
    bgMusic.play().catch((e) => console.error('Audio play failed:', e));
    document.getElementById('music-status')!.innerText = 'MUSIC: ON';
  } else {
    bgMusic.pause();
    document.getElementById('music-status')!.innerText = 'MUSIC: OFF';
  }
}

export function playTapSound(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const progress = state.currentProgressPercentage / 100;
  const clickFreq = 2200 + progress * 2000;
  const clackFreq = 450 + progress * 450;
  const bottomFreq = 130 + progress * 130;

  const oscClick = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  const clickFilter = audioCtx.createBiquadFilter();

  oscClick.type = 'triangle';
  oscClick.frequency.setValueAtTime(clickFreq, audioCtx.currentTime);
  oscClick.frequency.exponentialRampToValueAtTime(clickFreq * 1.1, audioCtx.currentTime + 0.005);

  clickFilter.type = 'bandpass';
  clickFilter.frequency.setValueAtTime(clickFreq, audioCtx.currentTime);
  clickFilter.Q.setValueAtTime(12, audioCtx.currentTime);

  clickGain.gain.setValueAtTime(0.45, audioCtx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.006);

  oscClick.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(audioCtx.destination);

  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();

  const bufferSize = audioCtx.sampleRate * 0.006;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(clickFreq * 0.95, audioCtx.currentTime);
  noiseFilter.Q.setValueAtTime(3.0, audioCtx.currentTime);

  noiseGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.006);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  const oscClack = audioCtx.createOscillator();
  const clackGain = audioCtx.createGain();
  const clackFilter = audioCtx.createBiquadFilter();

  oscClack.type = 'triangle';
  oscClack.frequency.setValueAtTime(clackFreq, audioCtx.currentTime);
  oscClack.frequency.exponentialRampToValueAtTime(clackFreq * 0.85, audioCtx.currentTime + 0.015);

  clackFilter.type = 'lowpass';
  clackFilter.frequency.setValueAtTime(clackFreq * 2.0, audioCtx.currentTime);
  clackFilter.Q.setValueAtTime(1.5, audioCtx.currentTime);

  clackGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  clackGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.018);

  oscClack.connect(clackFilter);
  clackFilter.connect(clackGain);
  clackGain.connect(audioCtx.destination);

  const oscBottom = audioCtx.createOscillator();
  const bottomGain = audioCtx.createGain();

  oscBottom.type = 'sine';
  oscBottom.frequency.setValueAtTime(bottomFreq, audioCtx.currentTime);
  oscBottom.frequency.exponentialRampToValueAtTime(bottomFreq * 0.7, audioCtx.currentTime + 0.035);

  bottomGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  bottomGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.038);

  oscBottom.connect(bottomGain);
  bottomGain.connect(audioCtx.destination);

  noise.start();
  oscClick.start();
  oscClack.start();
  oscBottom.start();

  oscClick.stop(audioCtx.currentTime + 0.01);
  oscClack.stop(audioCtx.currentTime + 0.025);
  oscBottom.stop(audioCtx.currentTime + 0.045);
}

export function playMilestoneSound(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 1.2);
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.3);
}

export function playSuccessSound(): void {
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.1);
    osc.stop(audioCtx.currentTime + i * 0.1 + 0.5);
  });
}

export function playPartyHorn(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
}
