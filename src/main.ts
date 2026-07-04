import './styles.css';
import { initAuth } from './firebase';
import { initIntro } from './intro';
import { initUI, changeTheme, resetSystem } from './ui';
import { initAdmin } from './admin';
import { initParticles, drawParticles, updateCanvasColor } from './effects';
import { toggleMusic } from './audio';
import { bgMusic } from './audio';

(window as any).changeTheme = changeTheme;
(window as any).resetSystem = resetSystem;
(window as any).toggleMusic = toggleMusic;
(window as any).logoutNode = () => {
  location.reload();
};

function registerSW(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('SW registration failed:', e);
    });
  }
}

function init(): void {
  registerSW();
  initAuth();
  initParticles();
  drawParticles();
  initIntro();
  initUI();
  initAdmin();

  const savedTheme = localStorage.getItem('nettas-theme') || 'nettas';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeDropdown = document.getElementById('theme-dropdown') as HTMLSelectElement;
  if (themeDropdown) themeDropdown.value = savedTheme;
  updateCanvasColor();

  const musicBtn = document.getElementById('btn-toggle-music');
  if (musicBtn) {
    musicBtn.addEventListener('click', toggleMusic);
  }

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
