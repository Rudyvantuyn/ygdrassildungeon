/** How computer-controlled party members pick their commands (autoplay, idle co-op players). */
import type { Combat, Command } from './combat';
import { SKILLS } from './data/skills';
import { isAlive, knownSkills, memberStats } from './party';
import type { SkillId } from './types';

/** A sensible command for every living party member (null for the fallen). */
export function chooseCommands(combat: Combat): (Command | null)[] {
  const party = combat.party;
  const living = combat.livingEnemies();
  const weakest = living.reduce((a, b) => (combat.enemies[a].hp <= combat.enemies[b].hp ? a : b));
  const knows = (i: number, id: SkillId) => knownSkills(party[i]).some((s) => s.id === id);
  const canUse = (i: number, id: SkillId) => knows(i, id) && party[i].sp >= SKILLS[id].sp;
  const hurt = party.flatMap((m, i) => (isAlive(m) && m.hp < memberStats(m).hp * 0.45 ? [i] : []));
  const fallen = party.flatMap((m, i) => (isAlive(m) ? [] : [i]));
  let mossLeft = combat.inventory.kindlingMoss ?? 0;

  return party.map((m, i): Command | null => {
    if (!isAlive(m)) return null;
    // Wake the fallen first: the Mender with a skill, anyone else with moss.
    if (fallen.length && m.classId === 'mender' && canUse(i, 'rekindle')) return { kind: 'skill', skill: 'rekindle', target: fallen.shift()! };
    if (fallen.length && mossLeft > 0 && (m.classId !== 'mender' || !canUse(i, 'rekindle'))) {
      mossLeft -= 1;
      return { kind: 'item', item: 'kindlingMoss', target: fallen.shift()! };
    }
    switch (m.classId) {
      case 'mender': {
        // Sleep and paralysis cost turns: wash them off once nobody is in danger.
        const held = party.findIndex((p, j) => isAlive(p) && j !== i && (combat.status[j].ailment === 'sleep' || combat.status[j].ailment === 'paralysis'));
        if (held >= 0 && hurt.length === 0 && canUse(i, 'cleanse')) return { kind: 'skill', skill: 'cleanse', target: held };
        if (hurt.length >= 2 && canUse(i, 'wellspring')) return { kind: 'skill', skill: 'wellspring', target: -1 };
        if (hurt.length >= 2 && canUse(i, 'verdantChorus')) return { kind: 'skill', skill: 'verdantChorus', target: -1 };
        if (hurt.length >= 1 && canUse(i, 'mend')) return { kind: 'skill', skill: 'mend', target: hurt[0] };
        if (hurt.length >= 1 && combat.inventory.tideDraught > 0) return { kind: 'item', item: 'tideDraught', target: hurt[0] };
        if (hurt.length >= 1 && combat.inventory.sapTonic > 0) return { kind: 'item', item: 'sapTonic', target: hurt[0] };
        break;
      }
      case 'runecaller': {
        const stormWeak = living.filter((e) => combat.enemies[e].def.weak.includes('storm')).length;
        if (living.length >= 2 && stormWeak >= 1 && canUse(i, 'thunderhead')) return { kind: 'skill', skill: 'thunderhead', target: -1 };
        if (living.length >= 2 && canUse(i, 'wildfire')) return { kind: 'skill', skill: 'wildfire', target: -1 };
        const weak = combat.enemies[weakest].def.weak;
        const runes = { fire: 'emberRune', frost: 'frostRune', storm: 'stormRune' } as const;
        const element = (['fire', 'frost', 'storm'] as const).find((e) => weak.includes(e)) ?? 'fire';
        const spell = runes[element];
        if (canUse(i, spell)) return { kind: 'skill', skill: spell, target: weakest };
        break;
      }
      case 'strider':
        if (living.length >= 3 && canUse(i, 'scatterVolley')) return { kind: 'skill', skill: 'scatterVolley', target: -1 };
        if ((combat.boss || combat.enemies[weakest].def.weak.includes('storm')) && canUse(i, 'galePiercer')) return { kind: 'skill', skill: 'galePiercer', target: weakest };
        if (combat.boss && canUse(i, 'twinFang')) return { kind: 'skill', skill: 'twinFang', target: weakest };
        break;
      case 'bastion':
        if (combat.boss && canUse(i, 'ironFormation') && combat.status[i].guard === 0) return { kind: 'skill', skill: 'ironFormation', target: -1 };
        if (living.length >= 2 && canUse(i, 'rampartCrash')) return { kind: 'skill', skill: 'rampartCrash', target: -1 };
        break;
    }
    return { kind: 'attack', target: weakest };
  });
}

