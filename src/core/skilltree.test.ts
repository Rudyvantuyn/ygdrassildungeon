import { describe, expect, it } from 'vitest';
import { CLASSES } from './data/classes';
import { SKILLS } from './data/skills';
import { Game } from './game';
import { createMember, knownSkills, memberStats } from './party';
import { autoSpend, pointsFor, raiseBlocker, raiseSkill, rankedSkill, resetSkills, unspentPoints, validSkills } from './skilltree';
import type { ClassId } from './types';

describe('skill points', () => {
  it('every level brings a point; new adventurers spend their first ones', () => {
    expect(pointsFor(1)).toBe(3);
    expect(pointsFor(10)).toBe(12);
    const m = createMember('Test', 'bastion');
    expect(unspentPoints(m)).toBe(0);
    expect(knownSkills(m).length).toBeGreaterThan(0);
  });

  it('skills need levels, other skills and points', () => {
    const m = createMember('Test', 'mender');
    resetSkills(m);
    expect(raiseBlocker(m, 'rekindle')).toBe('Needs level 6.');
    m.level = 6;
    expect(raiseBlocker(m, 'rekindle')).toBe('Needs Cleanse rank 2.');
    expect(raiseSkill(m, 'mend')).toBe(true);
    expect(raiseSkill(m, 'cleanse')).toBe(true);
    expect(raiseSkill(m, 'cleanse')).toBe(true);
    expect(raiseSkill(m, 'rekindle')).toBe(true);
    expect(raiseBlocker(m, 'emberRune')).toBe('Not a skill of this class.');
    while (unspentPoints(m) > 0) raiseSkill(m, 'mend');
    expect(raiseBlocker(m, 'mend')).toBe('No skill points left.');
  });

  it('ranks make skills stronger and passives raise stats', () => {
    const r1 = rankedSkill(SKILLS.emberRune, 1);
    const r10 = rankedSkill(SKILLS.emberRune, 10);
    expect(r10.power).toBeGreaterThan(r1.power);
    expect(r10.sp).toBeGreaterThan(r1.sp);
    expect(rankedSkill(SKILLS.challenge, 10).turns).toBeGreaterThan(SKILLS.challenge.turns!);
    const m = createMember('Test', 'bastion');
    m.level = 20;
    resetSkills(m);
    const before = memberStats(m).hp;
    m.skills = { stoutHeart: 10 };
    expect(memberStats(m).hp).toBeGreaterThan(before * 1.35);
  });

  it('the recommended build is valid for every class at every level', () => {
    for (const classId of Object.keys(CLASSES) as ClassId[]) {
      for (const level of [1, 5, 12, 25, 40]) {
        const m = createMember('Test', classId);
        m.level = level;
        autoSpend(m);
        expect(validSkills(classId, level, m.skills), `${classId} ${level}`).toBe(true);
        expect(unspentPoints(m), `${classId} ${level}`).toBe(0);
      }
    }
  });

  it('rejects impossible builds', () => {
    expect(validSkills('bastion', 1, { rampartCrash: 1 })).toBe(false);
    expect(validSkills('bastion', 3, { bulwarkBash: 6 })).toBe(false);
    expect(validSkills('bastion', 20, { emberRune: 1 })).toBe(false);
    expect(validSkills('bastion', 40, { bulwarkBash: 11 })).toBe(false);
    expect(validSkills('bastion', 5, { challenge: 2, ironFormation: 1 })).toBe(true);
  });

  it('saves from before skill points get a build for their level', () => {
    const game = Game.newGame(1);
    for (const m of game.state.party) {
      delete m.skills;
      m.level = 9;
    }
    const loaded = Game.load(game.serialize());
    for (const m of loaded.state.party) {
      expect(unspentPoints(m)).toBe(0);
      expect(knownSkills(m).length).toBeGreaterThan(1);
    }
  });
});
