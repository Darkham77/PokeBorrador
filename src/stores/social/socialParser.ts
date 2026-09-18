import type { GameState } from '@/types/system/game';
import type { ProfileRow, GameSaveRow } from '@/types/system/database';
import { ONLINE_PRESENCE_WINDOW_MS } from '@/logic/constants/gameplay.ts';
import { parseInstantSafe } from '@/logic/utils/timeUtils';
import type { Friend, PendingRequest } from './social.ts';

const DEFAULT_TRAINER_NAME = 'Entrenador' as const;
const DEFAULT_TRAINER_LEVEL = 1 as const;
const DEFAULT_GENDER = 'h' as const;
const DEFAULT_PLAYER_CLASS = 'entrenador' as const;
const EMPTY_STRING = '' as const;
const SHORT_FALLBACK_SLICE_LENGTH = 8 as const;

function resolveCandidateField<T>(fallback: T, ...candidates: (T | null | undefined)[]): T {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate !== EMPTY_STRING) {
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
  const baseName = friendUid.startsWith('local_') ? friendUid.replace('local_', EMPTY_STRING) : DEFAULT_TRAINER_NAME;
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
  return Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds < ONLINE_PRESENCE_WINDOW_MS;
}

function buildFriendItem(
  friendUid: string,
  profile: ProfileRow | undefined,
  saveRow: GameSaveRow | undefined
): Friend {
  const save = resolveSaveData(saveRow);
  const lastSeen = parseInstantSafe(saveRow?.updated_at);
  const isOnline = resolveIsOnline(lastSeen);
  const capitalizedFallback = resolveFallbackFriendName(friendUid);

  return {
    id: friendUid,
    username: resolveCandidateField(capitalizedFallback, save.trainer as string, profile?.username),
    level: resolveCandidateField(DEFAULT_TRAINER_LEVEL, save.trainerLevel as number, profile?.trainer_level),
    badges: resolveBadgesCount(save.badges),
    playerClass: resolveCandidateField(EMPTY_STRING, save.playerClass as string, profile?.player_class),
    faction: resolveCandidateField(EMPTY_STRING, save.faction as string, profile?.faction),
    nick_style: resolveCandidateField(EMPTY_STRING, save.nick_style as string, profile?.nick_style),
    avatar_style: resolveCandidateField(EMPTY_STRING, save.avatar_style as string, profile?.avatar_style),
    gender: resolveCandidateField(DEFAULT_GENDER, save.gender as string, profile?.gender),
    isOnline,
    lastSeen,
  };
}

export function parseFriendsList(
  friendIds: string[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[]
): Friend[] {
  const profilesById: Record<string, ProfileRow> = Object.fromEntries(
    profilesData.map((p) => [p.id, p])
  );
  const savesByUserId: Record<string, GameSaveRow> = Object.fromEntries(
    savesData.map((s) => [s.user_id, s])
  );

  return friendIds.map((fId: string) =>
    buildFriendItem(fId, profilesById[fId], savesByUserId[fId])
  );
}

export function parsePendingRequests(
  pending: PendingRequest[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[]
): PendingRequest[] {
  const savesByUserId: Record<string, GameSaveRow> = Object.fromEntries(
    savesData.map((s) => [s.user_id, s])
  );

  const profilesMap: Record<
    string,
    {
      username: string;
      nick_style: string;
      trainer_level: number;
      player_class: string;
      avatar_style: string;
      gender: string;
    }
  > = {};

  for (const p of profilesData) {
    const reqUid = p.id;
    const saveRow = savesByUserId[reqUid];
    const save = resolveSaveData(saveRow);
    const capitalizedFallback = reqUid.slice(0, SHORT_FALLBACK_SLICE_LENGTH).toUpperCase();

    profilesMap[reqUid] = {
      username: resolveCandidateField(capitalizedFallback, save.trainer as string, p?.username),
      nick_style: resolveCandidateField(EMPTY_STRING, save.nick_style as string, p?.nick_style),
      trainer_level: resolveCandidateField(DEFAULT_TRAINER_LEVEL, save.trainerLevel as number, p?.trainer_level),
      player_class: resolveCandidateField(DEFAULT_PLAYER_CLASS, save.playerClass as string, p?.player_class),
      avatar_style: resolveCandidateField(EMPTY_STRING, save.avatar_style as string, p?.avatar_style),
      gender: resolveCandidateField(DEFAULT_GENDER, save.gender as string, p?.gender),
    };
  }

  pending.forEach((r: PendingRequest) => {
    const profInfo = profilesMap[r.requester_id];
    if (profInfo) {
      r.profiles = {
        username: profInfo.username,
        nick_style: profInfo.nick_style,
        trainer_level: profInfo.trainer_level,
        player_class: profInfo.player_class,
        playerClass: profInfo.player_class,
        level: profInfo.trainer_level,
        avatar_style: profInfo.avatar_style,
        gender: profInfo.gender,
      };
    }
  });

  return pending;
}
