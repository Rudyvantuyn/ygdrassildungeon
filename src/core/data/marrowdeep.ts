/**
 * Chapter III, the Marrowdeep (Ymir's bones), now part of the Rootdeep (floors 11-15 in FLOORS). Kept as names for
 * the chapter's floors and for the drafting table, which borrows monsters and looks from every floor.
 */
import { FLOORS, type FloorDef } from './floors';

/** The chapter's floors (11-15). */
export const PREPARED_FLOORS: readonly FloorDef[] = FLOORS.slice(10, 15);

/** Everything the Drafting Table can borrow from. */
export const DESIGN_FLOORS: readonly FloorDef[] = FLOORS;
