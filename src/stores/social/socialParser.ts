import { DEFAULT_PLAYER_CLASS } from '@/data/player/playerClasses.ts';
import {
  DEFAULT_TRAINER_NAME,
  DEFAULT_TRAINER_LEVEL,
  DEFAULT_GENDER
} from '@/types/system/game.ts';
import type { GameState } from '@/types/system/game';
import type { ProfileRow, GameSaveRow } from '@/types/system/database';
import { ONLINE_PRESENCE_WINDOW_MS } from '@/logic/constants/gameplay.ts';
import { parseInstantSafe } from '@/logic/utils/timeUtils';
import type { Friend, PendingRequest } from './social.ts';

const SHORT_FALLBACK_SLICE_LENGTH = 8 as const;

function resolveCandidateField<T>(fallback: T, ...candidates: (T | null | undefined)[]): T {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate !== '') {
      return candidate;
    }
  }
  return fallback;
}

function resolveBadgesCount(badges: unknown): number {
  if (badges && typeof badges === 'object') {
    return Object.keys(badges).length;
  }
  if (typeof badges === 'number') {
    return badges;
  }
  return 0;
}

function resolveFallbackFriendName(friendUid: string): string {
  const baseName = friendUid.startsWith('local_')
    ? friendUid.replace('local_', '')
    : DEFAULT_TRAINER_NAME;
  return baseName.charAt(0).toUpperCase() + baseName.slice(1);
}

function resolveSaveData(saveRow?: GameSaveRow): Partial<GameState> {
  if (!saveRow?.save_data) return {};
  if (typeof saveRow.save_data === 'string') {
    try {
      return JSON.parse(saveRow.save_data);
    } catch {
      return {};
    }
  }
  return saveRow.save_data as Partial<GameState>;
}

function resolveIsOnline(lastSeen?: Temporal.Instant | null): boolean {
  if (!lastSeen) return false;
  return (
    Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds <
    ONLINE_PRESENCE_WINDOW_MS
  );
}

function buildFriendItem(
  friendUid: string,
  profile: ProfileRow | undefined,
  saveRow?: GameSaveRow
): Friend {
  const save = resolveSaveData(saveRow);
  const lastSeen = parseInstantSafe(profile?.last_played_at || saveRow?.updated_at);
  const isOnline = resolveIsOnline(lastSeen);
  const capitalizedFallback = resolveFallbackFriendName(friendUid);

  return {
    id: friendUid,
    username: resolveCandidateField(capitalizedFallback, profile?.username, save.trainer as string),
    level: resolveCandidateField(
      DEFAULT_TRAINER_LEVEL,
      profile?.trainer_level,
      save.trainerLevel as number
    ),
    badges: profile?.badges ?? resolveBadgesCount(save.badges),
    playerClass: resolveCandidateField('', profile?.player_class, save.playerClass as string),
    faction: resolveCandidateField('', profile?.faction, save.faction as string),
    nick_style: resolveCandidateField('', profile?.nick_style, save.nick_style as string),
    avatar_style: resolveCandidateField('', profile?.avatar_style, save.avatar_style as string),
    gender: resolveCandidateField(DEFAULT_GENDER, profile?.gender, save.gender as string),
    isOnline,
    lastSeen
  };
}

export function parseFriendsList(
  friendIds: string[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[] = []
): Friend[] {
  const profilesById = new Map<string, ProfileRow>(profilesData.map((p) => [p.id, p]));
  const savesByUserId = new Map<string, GameSaveRow>(savesData.map((s) => [s.user_id, s]));

  return friendIds.map((fId: string) =>
    buildFriendItem(fId, profilesById.get(fId), savesByUserId.get(fId))
  );
}

export function parsePendingRequests(
  pending: PendingRequest[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[] = []
): PendingRequest[] {
  const savesByUserId = new Map<string, GameSaveRow>(savesData.map((s) => [s.user_id, s]));

  const profilesMap = new Map<
    string,
    {
      username: string;
      nick_style: string;
      trainer_level: number;
      player_class: string;
      avatar_style: string;
      gender: string;
    }
  >();

  for (const p of profilesData) {
    const reqUid = p.id;
    const saveRow = savesByUserId.get(reqUid);
    const save = resolveSaveData(saveRow);
    const capitalizedFallback = reqUid.slice(0, SHORT_FALLBACK_SLICE_LENGTH).toUpperCase();

    profilesMap.set(reqUid, {
      username: resolveCandidateField(capitalizedFallback, p?.username, save.trainer as string),
      nick_style: resolveCandidateField('', p?.nick_style, save.nick_style as string),
      trainer_level: resolveCandidateField(
        DEFAULT_TRAINER_LEVEL,
        p?.trainer_level,
        save.trainerLevel as number
      ),
      player_class: resolveCandidateField(
        DEFAULT_PLAYER_CLASS,
        p?.player_class,
        save.playerClass as string
      ),
      avatar_style: resolveCandidateField('', p?.avatar_style, save.avatar_style as string),
      gender: resolveCandidateField(DEFAULT_GENDER, p?.gender, save.gender as string)
    });
  }

  pending.forEach((r: PendingRequest) => {
    const profInfo = profilesMap.get(r.requester_id);
    if (profInfo) {
      r.profiles = {
        username: profInfo.username,
        nick_style: profInfo.nick_style,
        trainer_level: profInfo.trainer_level,
        player_class: profInfo.player_class,
        playerClass: profInfo.player_class,
        level: profInfo.trainer_level,
        avatar_style: profInfo.avatar_style,
        gender: profInfo.gender
      };
    }
  });

  return pending;
}
