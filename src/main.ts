import './styles.css';
import { state } from './firebase';
import { initIntro } from './intro';
import { initUI, changeTheme, resetSystem } from './ui';
import { initAdmin } from './admin';
import { initParticles, drawParticles, updateCanvasColor } from './effects';
import { bgMusic } from './audio';

(window as any).changeTheme = changeTheme;
(window as any).resetSystem = resetSystem;
(window as any).toggleMusic = () => {
  import('./audio').then((mod) => mod.toggleMusic());
};
(window as any).logoutNode = () => {
  location.reload();
};

function init(): void {
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
