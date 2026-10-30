/** Positions on the stage (the 1280×720 or 960×440 game area), whatever its scale and layout. */

/** The point in stage coordinates where `el`'s box sits, at fractions (fx, fy) of its width and height. */
export function stagePoint(el: Element, fx = 0.5, fy = 0.5): { x: number; y: number } {
  const stage = document.getElementById('stage');
  if (!stage) return { x: 0, y: 0 };
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const scale = s.width / stage.offsetWidth || 1;
  return { x: (r.left + r.width * fx - s.left) / scale, y: (r.top + r.height * fy - s.top) / scale };
}
