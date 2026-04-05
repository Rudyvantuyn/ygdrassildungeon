export interface AtlasGroup {
  key: string;
  members: string[];
}

export const atlasPlan: AtlasGroup[] = [
  {
    key: "ui-atlas",
    members: ["icon-strike", "icon-guard", "icon-arcane", "icon-bleed"]
  },
  {
    key: "class-portraits-atlas",
    members: ["guardian", "ranger", "mystic", "rogue"]
  },
  {
    key: "vfx-atlas",
    members: ["slash", "arcane-burst", "summon-circle"]
  }
];
