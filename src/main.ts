import { inject } from '@vercel/analytics';
import { audio } from './audio/audio';
import { watchErrors } from './net/reports';
import { App } from './ui/app';
// Fonts are bundled with the game (SIL Open Font License), so no font service sees players' addresses.
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/styles.css';
import { leaveOldAddress, takeCarriedSave } from './site/transfer';

/** Starts the game (after a save carried over from the old address, if any, has been taken in). */
function start(): void {
  const root = document.getElementById('app')!;
  const app = new App(root);
  watchErrors(() => app.reportContext());
  // Visitor counts (Vercel Web Analytics: no cookies, no personal data; only on the live site).
  // Only on our own site: itch.io counts its own visitors.
  if (__BUILD__ !== 'dev' && !__BUILD__.endsWith('-itch')) inject({ mode: 'production' });

  /**
   * Scale the stage to fit any window. Small screens (phones) get their own, more compact 960×440 layout
   * instead of a shrunken 1280×720 one, so text and buttons stay large enough to read and tap.
   */
  function fit(): void {
    const stage = document.getElementById('stage')!;
    const w = window.visualViewport?.width ?? window.innerWidth;
    const h = window.visualViewport?.height ?? window.innerHeight;
    const phone = Math.min(w / 1280, h / 720) < 0.72;
    document.body.classList.toggle('phone', phone);
    const [sw, sh] = phone ? [960, 440] : [1280, 720];
    stage.style.transform = `scale(${Math.min(w / sw, h / sh)})`;
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
  document.body.classList.toggle('touch', touch);
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
}

void (async () => {
  if (__BUILD__.endsWith('-itch')) return start();
  if (await leaveOldAddress()) return;
  await takeCarriedSave();
  start();
})();
