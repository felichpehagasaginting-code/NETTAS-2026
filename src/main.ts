import './styles.css';
import { initUI, resetSystem } from './ui';
import { initAdmin } from './admin';
import { initParticles, drawParticles, updateCanvasColor } from './effects';
import { toggleMusic } from './audio';

(window as any).resetSystem = resetSystem;
(window as any).toggleMusic = toggleMusic;

function registerSW(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('SW registration failed:', e);
    });
  }
}

function init(): void {
  registerSW();
  initParticles();
  drawParticles();
  initUI();
  updateCanvasColor();

  requestAnimationFrame(() => {
    initAdmin();
  });

  const resetBtn = document.getElementById('btn-reset-system');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSystem);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
