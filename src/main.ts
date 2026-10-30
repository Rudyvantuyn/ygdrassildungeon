import { audio } from './audio/audio';
import { watchErrors } from './net/reports';
import { App } from './ui/app';
import './ui/styles.css';

const root = document.getElementById('app')!;
const app = new App(root);
watchErrors(() => app.reportContext());

// Scale the fixed 1280×720 stage to fit any window.
function fit(): void {
  const stage = document.getElementById('stage')!;
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fit);
fit();

function loop(time: number): void {
  app.frame(time);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

(window as unknown as { ygg: App; yggAudio: typeof audio }).ygg = app;
(window as unknown as { yggAudio: typeof audio }).yggAudio = audio;
