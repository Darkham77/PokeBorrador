import { describe, it, expect } from 'vitest';
import { RivalTeamGenerator } from '@/logic/battle/rivalTeamGenerator';
import { ENABLED_POKEMON_IDS_SET, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { Dex, toID } from '@pkmn/sim';

describe('RivalTeamGenerator - Showdown Extended Engine', () => {
  it('generates a team where slot 0 is always the requested Ace', () => {
    const ace = 'dragonite';
    const team = RivalTeamGenerator.generateTeam({
      level: 45,
      teamSize: 4,
      aceSpeciesId: ace,
    });

    expect(team.length).toBe(4);
    expect(toID(team[0]!.species)).toBe('dragonite');
  });

  it('generates 100% enabled species across all team members', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 50,
      teamSize: 6,
      aceSpeciesId: 'charizard',
    });

    expect(team.length).toBe(6);
    for (const member of team) {
      expect(ENABLED_POKEMON_IDS_SET.has(toID(member.species))).toBe(true);
    }
  });

  it('applies the exact level to all team members', () => {
    const targetLevel = 37;
    const team = RivalTeamGenerator.generateTeam({
      level: targetLevel,
      teamSize: 3,
      aceSpeciesId: 'alakazam',
    });

    for (const member of team) {
      expect(member.level).toBe(targetLevel);
    }
  });

  it('caps level at MAX_POKEMON_LEVEL when requested at maximum boundary', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: MAX_POKEMON_LEVEL,
      teamSize: 5,
      aceSpeciesId: 'gengar',
    });

    for (const member of team) {
      expect(member.level).toBe(100);
    }
  });

  it('contains no duplicate species in the team', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 60,
      teamSize: 6,
      aceSpeciesId: 'machamp',
    });

    const speciesList = team.map(m => toID(m.species));
    const uniqueSpecies = new Set(speciesList);
    expect(uniqueSpecies.size).toBe(team.length);
  });

  it('produces legal movesets recognized by @pkmn/sim Dex', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 55,
      teamSize: 4,
      aceSpeciesId: 'lapras',
    });

    for (const member of team) {
      expect(member.moves.length).toBeGreaterThan(0);
      expect(member.moves.length).toBeLessThanOrEqual(4);
      for (const moveId of member.moves) {
        if (!moveId) continue;
        const move = Dex.moves.get(moveId);
        expect(move.exists).toBe(true);
      }
    }
  });

  it('handles teamSize = 1 correctly', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 20,
      teamSize: 1,
      aceSpeciesId: 'charizard',
    });

    expect(team.length).toBe(1);
    expect(toID(team[0]!.species)).toBe('charizard');
    expect(team[0]!.level).toBe(20);
  });
});
