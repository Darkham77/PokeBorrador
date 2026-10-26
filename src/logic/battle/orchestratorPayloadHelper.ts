import type { DisplayText } from '@francogp/auditor';

import { toID } from '@/logic/utils/strings.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';

import { mapToShowdownSet } from './showdownAdapter.ts';
import { getShowdownNickname } from './showdownUidMapper.ts';

export interface SeatPayload {
  name: string;
  team: (ReturnType<typeof mapToShowdownSet> & { nickname: string; name: string; uid?: string })[];
  teamList: Pokemon[];
  hps: Record<DisplayText, number>;
  statuses: Record<DisplayText, string>;
  movesPP: Record<DisplayText, Record<DisplayText, number>>;
}

export function prepareSeatPayload(
  rawTeam: Pokemon[],
  initialMon?: Pokemon,
  debugSeed?: unknown,
  trainerName: string = 'Player'
): SeatPayload {
  const teamList = [...(rawTeam || [])].filter((p): p is Pokemon => !!p);
  if (initialMon) {
    const idx = teamList.findIndex((p) => p.uid === initialMon.uid);
    if (idx > 0 && !debugSeed) {
      const [p] = teamList.splice(idx, 1);
      if (p) teamList.unshift(p);
    }
  }

  const showdownSets = teamList.map((p) => mapToShowdownSet(p));
  const hps: Record<DisplayText, number> = {}; // open-record: Pokémon UID to current HP mapping
  const statuses: Record<DisplayText, string> = {}; // open-record: Pokémon UID to primary status mapping
  const movesPP: Record<DisplayText, Record<DisplayText, number>> = {}; // open-record: Pokémon UID to move PP mapping

  teamList.forEach((p) => {
    if (p) {
      hps[p.uid] = p.hp;
      statuses[p.uid] = p.status || '';
      if (Array.isArray(p.moves)) {
        movesPP[p.uid] = {};
        p.moves.forEach((m) => {
          if (m && m.id && typeof m.pp === 'number') {
            movesPP[p.uid]![toID(m.id)] = m.pp;
          }
        });
      }
    }
  });

  const formattedTeam = showdownSets.map((p, idx) => ({
    ...p,
    nickname: getShowdownNickname(teamList[idx]?.uid || ''),
    name: getShowdownNickname(teamList[idx]?.uid || ''),
    uid: teamList[idx]?.uid
  }));

  return {
    name: trainerName,
    team: formattedTeam,
    teamList,
    hps,
    statuses,
    movesPP
  };
}
