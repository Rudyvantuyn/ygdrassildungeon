/**
 * Fragments: short pieces of the Rootdeep's past, found in a few chests and in the hearts of guardians. They are kept
 * in the Journal and, for a signed-in player, on the website's World page. Written in line with docs/verhaal.md
 * (a proposal while Thijs is busy; he may change them). Hints only: never reveal a secret outright.
 */
export interface FragmentDef {
  id: string;
  title: string;
  text: string;
  /** Where it lies: in the first chest of a floor, or with the guardian of a floor (0-based floor numbers). */
  where: { chest: number } | { guardian: number };
}

export const FRAGMENTS: FragmentDef[] = [
  {
    id: 'firstNote',
    title: "A Wayfinder's first note",
    text: 'Day one. The moss eats every sound. Sigrid says nobody has ever mapped these roots, so I draw as I go. If you find this, I went left. Go right.',
    where: { chest: 0 },
  },
  {
    id: 'elderLeaf',
    title: 'Under the rot',
    text: 'Beneath the rot, cut into the heartwood, a rune of gold. It is warm to the touch, and it belongs to no rune-row Lindholm knows.',
    where: { guardian: 2 },
  },
  {
    id: 'gnawedBone',
    title: 'Gnawed bone',
    text: 'The Rootgnawer\'s teeth were never made for wood. Its belly held white splinters of bone, gnawed smooth. Something sent it to chew a way through. Or to chew a way shut.',
    where: { guardian: 4 },
  },
  {
    id: 'saltBottle',
    title: 'A bottle in the salt',
    text: 'Sealed with wax and a ship\'s mark: a longship under three stars. One line inside. "The fleet holds. The Jarl says the way is close. Tell them we kept the Pact." It is a hundred winters old.',
    where: { chest: 5 },
  },
  {
    id: 'hallvardsLog',
    title: "A page of Hallvard's log",
    text: '"We found it: a gate without a door. A woman with a lantern was waiting there, and she smiled at us. I do not remember what she said. I remember the water."',
    where: { guardian: 7 },
  },
  {
    id: 'coralHorn',
    title: 'A horn in the coral',
    text: 'A drinking horn the coral has half swallowed. Runes run round the rim: a toast to the realms, from a crew of men, giants and one dwarf. Once they sailed together.',
    where: { chest: 7 },
  },
  {
    id: 'secondRune',
    title: 'The second rune',
    text: 'The Hafgufa\'s heart held gold too. When it broke, far above, a horn sounded that no one in Lindholm blew. Brynja did not sleep that night.',
    where: { guardian: 9 },
  },
  {
    id: 'waystone',
    title: 'A scratched waystone',
    text: 'A giants\' waystone on the old trade road. Every name on it was chiselled off, carefully, with a very fine tool. Only the arrows are left, and they all point down.',
    where: { chest: 10 },
  },
  {
    id: 'chiselMark',
    title: 'The chisel mark',
    text: 'The rune on the rib did not grow there. It was cut. Brother Aske ran his thumb along the groove. "Nails in a grave," he said. "And what happens when the last one comes out?"',
    where: { guardian: 12 },
  },
  {
    id: 'stoneHeart',
    title: 'A stone that beats',
    text: 'Hrungnir\'s heart was made a lock while he still lived. It is cold now. Hold it long enough and you will swear it beats, once. Above you, a raven takes wing.',
    where: { guardian: 14 },
  },
];

export const FRAGMENT_BY_ID: Record<string, FragmentDef> = Object.fromEntries(FRAGMENTS.map((f) => [f.id, f]));

/** The fragment in the first chest of a floor, or with its guardian. */
export function fragmentAt(floor: number, kind: 'chest' | 'guardian'): FragmentDef | undefined {
  return FRAGMENTS.find((f) => ('chest' in f.where ? kind === 'chest' && f.where.chest === floor : kind === 'guardian' && f.where.guardian === floor));
}
