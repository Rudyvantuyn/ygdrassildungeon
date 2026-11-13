/** Pictures and names for the four elements, shared by the fight, the skill tree and the bestiary. */
import type { Element } from '../core/types';

export const ELEMENT_NAMES: Record<Element, string> = { phys: 'Physical', fire: 'Fire', frost: 'Frost', storm: 'Storm' };

export function elementIcon(element: Element): string {
  return `art/icons/el-${element}.webp`;
}
