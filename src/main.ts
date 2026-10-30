import { audio } from './audio/audio';
import { watchErrors } from './net/reports';
import { App } from './ui/app';
// Fonts are bundled with the game (SIL Open Font License), so no font service sees players' addresses.
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-800.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-400-italic.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/nunito-sans/latin-800.css';
import './ui/styles.css';

const root = document.getElementById('app')!;
const app = new App(root);
watchErrors(() => app.reportContext());

// Scale the fixed 1280×720 stage to fit any window.
function fit(): void {
  const stage = document.getElementById('stage')!;
  const w = window.visualViewport?.width ?? window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  stage.style.transform = `scale(${Math.min(w / 1280, h / 720)})`;
}
window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
fit();

// Phones held upright: the game is made for landscape. Offer full screen, or play on anyway.
const rotate = document.createElement('div');
rotate.id = 'rotate-hint';
rotate.innerHTML = '<div class="rotate-icon">⟳</div><p>Turn your phone sideways to play.</p>';
const anyway = document.createElement('button');
anyway.textContent = 'Play upright anyway';
anyway.addEventListener('click', () => rotate.classList.add('dismissed'));
rotate.append(anyway);
document.body.append(rotate);

// On touch devices the first tap goes full screen (where the browser allows it) and asks for landscape.
const touch = window.matchMedia('(pointer: coarse)').matches;
if (touch && document.documentElement.requestFullscreen) {
  const goFull = () => {
    document.documentElement
      .requestFullscreen({ navigationUI: 'hide' })
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
      .catch(() => undefined);
  };
  window.addEventListener('pointerup', goFull, { once: true });
}

function loop(time: number): void {
  app.frame(time);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

(window as unknown as { ygg: App; yggAudio: typeof audio }).ygg = app;
(window as unknown as { yggAudio: typeof audio }).yggAudio = audio;
