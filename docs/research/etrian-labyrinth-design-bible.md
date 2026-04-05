# Etrian + Labyrinth Design Bible

Purpose: capture the full design DNA of Etrian Odyssey and close "Labyrinth of" style games, then translate it into actionable direction for this project.

Last updated: 2026-03-28

---

## 1) What Etrian Odyssey is at its core

Etrian Odyssey is not "just a dungeon crawler". Its identity comes from this exact mix:

1. First-person, grid-based exploration with deliberate movement.
2. Player-authored mapping as a core mechanic (not cosmetic).
3. Turn-based combat built around class synergy and encounter planning.
4. FOE pressure (visible high-threat enemies that alter pathing decisions).
5. Strong town loop: prep -> descend -> retreat -> improve -> re-enter.
6. High challenge, high consequence, high satisfaction.

If one of these is missing, it no longer feels truly EO.

---

## 2) Series overview and useful differences

## EO1 (Etrian Odyssey)
- Establishes the entire formula: map drawing, FOEs, 5-person class party, sparse but meaningful narrative.
- Town is menu-centric and functional.
- Heavy old-school friction is intentional (retreat, risk, resource pressure).

## EO2 (Heroes of Lagaard)
- Refines the original loop with more class and quality improvements.
- Maintains strict challenge and progression by strata.
- Force mechanics and class expression become more pronounced.

## EO3 (The Drowned City)
- Adds subclassing and sea exploration layer.
- Introduces sea quests and broader route planning.
- Strongly expands build depth and side content.

## EO4 (Legends of the Titan)
- Adds overworld/airship exploration, multiple dungeon regions.
- Keeps EO core but improves onboarding and readability.
- Good reference for "broader world map but still EO".

## EO Untold 1 + EO2 Untold
- Add Story Mode + Classic Mode split.
- Add preset story cast while preserving map/combat loop.
- Introduce modern QoL and difficulty options without fully losing old identity.
- Grimoire/Force revisions show experimentation with build systems.

## EO5 (Beyond the Myth)
- Race system + title/mastery specialization.
- Very strong class fantasy and build identity.
- Excellent reference for long-term class progression trees.

## EO Nexus
- "All-stars" culmination: many classes, subclassing, large content volume.
- Very high build complexity and broad dungeon variety.
- Best reference for late-stage content breadth and retention.

## HD Remasters (EO1/2/3 HD)
- Confirm that QoL can be layered over old-school structure.
- Useful reminder: readability and accessibility can improve without changing soul.

---

## 3) EO town/menu logic (the part you explicitly want)

This is critical for your direction.

The EO city loop logic is:
- City is a **navigation shell** + fantasy context.
- Player chooses from a compact list of services.
- Services are semantically distinct and always useful:
  - Inn / Rest
  - Shop / Sell
  - Guild / Party management
  - Quests / Missions
  - Story office / progression gate
  - Labyrinth entry
- UI is fast, legible, repeatable, low friction.

The city is not a sandbox; it is a ritualized decision hub.

---

## 4) EO story structure and tone

EO story is generally:
- Light-to-moderate foreground narrative.
- Mystery-first worldbuilding.
- Exploration reveals truth in layers.
- "You are an explorer guild" framing keeps player agency central.

Untold variants increase cinematic narrative, but classic EO strength remains:
- Story supports the loop; it does not replace it.

Design implication for your game:
- Narrative should justify depth runs, districts, NPCs, and seasons.
- Keep story beats punctuated between expeditions.
- Avoid long cutscene blocks that interrupt the prep/delve rhythm.

---

## 5) Combat and class design DNA

Core class/combat principles across EO:
- Front/back row meaningfully matters.
- Roles are explicit (damage, tanking, binds/ailments, healing/support).
- Skills are strongly synergistic, not isolated.
- Resource management (TP/skills) matters over long dives.
- Bosses test preparation and pattern reading, not only stats.

What to preserve:
- Build planning should happen both in town and in combat.
- Encounter design should reward specific team decisions.
- Combat UI must surface turn clarity, buffs/debuffs, and enemy pressure.

---

## 6) Mapping and traversal design

EO mapping is a gameplay layer with strategic value:
- Players annotate hazards, shortcuts, gather points, FOE routes.
- Path memory and route mastery create mastery fantasy.
- Backtracking is meaningful once shortcuts unlock.

For your project:
- Even if not literal stylus mapping, preserve "information mastery":
  - marked routes
  - player notes/icons
  - risk tiles
  - discovered shortcuts
  - FOE patrol indicators

---

## 7) FOEs and threat architecture

FOEs are signature pressure:
- Visible on map.
- Strong enough to avoid or plan around.
- Change movement puzzles and combat risk.
- Teach "sometimes avoid now, kill later".

This creates unique tension absent in random-only encounters.

For your implementation:
- Keep at least one "roaming elite" layer in dungeons.
- Tie FOE defeat to progression rewards, quests, and map control.

---

## 8) Items, economy, and progression loop

EO-like economy is loop-driven:
- Delve -> gather loot/materials -> sell/craft/upgrade -> delve deeper.
- Shop inventory unlock can be tied to discovered materials.
- Itemization supports strategic options, not pure stat inflation.

Your current systems (shop, blacksmith, missions, skill trees) are aligned.
Needed nuance:
- Distinct sinks with clear purpose.
- Build-defining equipment choices.
- Better signaling of "what to buy now vs save for later".

---

## 9) What "Labyrinth of" brings (Refrain/Galleria style)

Labyrinth of Refrain / Galleria adds adjacent ideas:
- First-person labyrinth exploration remains.
- Team architecture is larger and system-dense (covens/brigades).
- Heavier story/VN framing and darker tone.
- Deep meta-progression and high complexity.

Usefulness to your target:
- Great for expanding endgame systems and party meta depth.
- Good reference for darker narrative hooks and long-form campaign layers.
- Should be blended carefully so EO clarity does not get buried.

---

## 10) Other close genre references worth borrowing selectively

- Stranger of Sword City / Undernauts:
  - harsher survival pacing, trap pressure, grim atmosphere.
- Class of Heroes:
  - Wizardry-like class dungeon fundamentals.
- 7th Dragon (adjacent party RPG):
  - class identity and mission-forward structure.

Do not copy all complexity at once. Keep one clear progression spine.

---

## 11) Exact design target for this project (interpreting your intent)

Your desired game target is:

1. EO-style city command loop and service rhythm.
2. High-fantasy anime presentation.
3. Strong class expression and party building.
4. Dungeon depth + bosses + route pressure.
5. Modern livegame systems layered on top (missions, shop, seasons, crafting).
6. Solo-first core loop with optional co-op social extension.

In short: "EO soul + modern meta loop + strong art direction".

---

## 12) Non-negotiable pillars to keep during implementation

1. City should feel like a ritualized command hub, not generic app dashboard.
2. Every run must have meaningful prep decisions.
3. Build depth must produce noticeably different play styles.
4. Risk/reward and retreat pressure must stay relevant.
5. UI must stay compact, readable, and fast to operate repeatedly.
6. Narrative should support exploration momentum, never smother it.

---

## 13) Practical implementation translation (for our current codebase)

Use this as guardrail:

- CityScene:
  - EO-style command list always visible.
  - Hotspots are flavor/shortcut, command list remains primary.

- Shop/Training/Mission/Blacksmith scenes:
  - unify layout language to EO-style command + detail panel.
  - reduce scattered buttons, increase menu rhythm consistency.

- Dungeon/combat:
  - reinforce route pressure (FOE layer, hazard signaling, retreat stakes).
  - keep class readability at UI level (role tags, expected contribution).

- Progression:
  - class mastery should branch into meaningful identity.
  - item/skill progression should suggest clear build archetypes.

- Narrative:
  - city NPC arcs tied to systems (shopkeeper, guildmaster, trainer, smith).
  - chapter pacing linked to strata completion and boss milestones.

---

## 14) Reference links used in this research

Etrian Odyssey:
- https://en.wikipedia.org/wiki/Etrian_Odyssey_(video_game)
- https://en.wikipedia.org/wiki/Etrian_Odyssey_II:_Heroes_of_Lagaard
- https://en.wikipedia.org/wiki/Etrian_Odyssey_III:_The_Drowned_City
- https://en.wikipedia.org/wiki/Etrian_Odyssey_IV:_Legends_of_the_Titan
- https://en.wikipedia.org/wiki/Etrian_Odyssey_V:_Beyond_the_Myth
- https://en.wikipedia.org/wiki/Etrian_Odyssey_Untold:_The_Millennium_Girl
- https://en.wikipedia.org/wiki/Etrian_Odyssey_2_Untold:_The_Fafnir_Knight
- https://en.wikipedia.org/wiki/Etrian_Odyssey_Nexus
- https://etrianodyssey.wiki/wiki/Game_Mechanics
- https://www.etrianodyssey.wiki/wiki/FOE
- https://strategywiki.org/wiki/Etrian_Odyssey/Gameplay

Labyrinth of:
- https://en.wikipedia.org/wiki/Labyrinth_of_Refrain:_Coven_of_Dusk
- https://en.wikipedia.org/wiki/Labyrinth_of_Galleria:_The_Moon_Society
- https://strategywiki.org/wiki/Labyrinth_of_Refrain:_Coven_of_Dusk

Adjacent references:
- https://store.steampowered.com/app/409890
- https://www.aksysgames.com/undernauts

---

## 15) Locked decisions from user (2026-03-28)

These are explicit direction decisions from the project owner and should be treated as constraints.

1. Monetization direction:
   - The project may include a player monetization model later.
   - Hard constraint: game must remain fun and fair; no design choices that break enjoyment.

2. Narrative direction:
   - Prefer Classic EO style framing.
   - Keep one complete main story arc plus quests running in parallel.

3. Mapping direction:
   - Add a player annotation layer (very suitable for PC).
   - This should be a first-class feature, not a minor note pad.

4. Session pacing:
   - Target expedition length is 25-40 minutes.

5. Co-op direction:
   - Co-op will evolve later into full dungeons with dedicated design.
   - Current focus remains solo-first.

6. City interaction mode:
   - Final decision: Mode A.
   - EO command list is primary navigation.
   - City hotspots remain optional shortcuts for immersion and fast access.

