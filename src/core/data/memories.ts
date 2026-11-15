/**
 * Memories: glimpses of how Midgard was made, and of Ymir before it. Written by Thijs (see docs/verhaal.md).
 *
 * Rules for the texts:
 * - They come from someone who is never named. Never name, describe or hint at who it is in a shard.
 * - Each memory has SHARDS_PER_MEMORY shards; a shard is a short text (one to three sentences) and may have a picture
 *   (a real photo through scripts/photo-to-art.py, under art/memories/; never AI-made).
 * - Shards are found one at a time and in no fixed order, so each one should make sense on its own, and the whole
 *   memory should read well once all of its shards are found.
 * - Players should come to love Ymir, and regret a little that Midgard was made from him.
 *
 * Until memories are written here, no shard can drop: the game needs nothing else to start using them.
 */
export interface MemoryShard {
  text: string;
  /** A picture under art/memories/ (optional). */
  image?: string;
}

export interface MemoryDef {
  id: string;
  title: string;
  /** In reading order; found at random. */
  shards: MemoryShard[];
}

export const SHARDS_PER_MEMORY = 15;

export const MEMORIES: MemoryDef[] = [];

export const MEMORY_BY_ID: Record<string, MemoryDef> = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));
