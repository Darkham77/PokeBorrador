export interface ChoiceRequestPokemon {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  stats?: {
    hp?: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
  moves?: string[];
  ability?: string;
  reviving?: boolean;
}

export interface RevivingForceSwitchRequest {
  reviving: boolean;
}

export type ForceSwitchRequest = boolean | RevivingForceSwitchRequest | null;

export interface ChoiceRequest {
  wait?: boolean;
  teamPreview?: boolean;
  forceSwitch?: ForceSwitchRequest[] | null;
  active?: Array<{
    trapped?: boolean;
    maybeTrapped?: boolean;
    canMegaEvo?: boolean;
    canZMove?: unknown;
    canDynamax?: boolean;
    canTerastallize?: string | null;
    moves?: Array<{
      move?: string;
      id: string;
      disabled?: boolean | string;
      pp?: number;
      maxpp?: number;
      target?: string;
    }>;
  }> | null;
  side?: {
    name?: string;
    id?: string;
    pokemon: ChoiceRequestPokemon[];
  };
  requestType?: 'move' | 'switch' | 'team' | 'wait';
  noCancel?: boolean;
}

export type RequestKind = 'none' | 'team-preview' | 'force-switch' | 'revive-target' | 'move' | 'wait';

export function isRevivingForceSwitchRequest(req: unknown): boolean {
  if (!req || typeof req !== 'object') return false;
  const request = req as ChoiceRequest;
  const hasRevivingForceSwitch = request.forceSwitch?.some(
    (entry) => typeof entry === 'object' && entry !== null && entry.reviving === true
  ) ?? false;
  const hasRevivingActivePokemon = request.side?.pokemon.some(
    (pokemon) => pokemon.active && pokemon.reviving === true
  ) ?? false;
  return hasRevivingForceSwitch || hasRevivingActivePokemon;
}

/**
 * Classifies a Showdown battle request to determine its action type.
 */
export function classifyRequest(req: unknown): RequestKind {
  if (!req || typeof req !== 'object') return 'none';
  const cReq = req as ChoiceRequest;
  if (cReq.wait) return 'wait';
  if (cReq.teamPreview) return 'team-preview';
  if (cReq.forceSwitch && Array.isArray(cReq.forceSwitch) && cReq.forceSwitch.some(x => !!x)) {
    if (isRevivingForceSwitchRequest(cReq)) return 'revive-target';
    return 'force-switch';
  }
  if (Array.isArray(cReq.active) && cReq.active.length > 0) return 'move';
  return 'none';
}

/**
 * Determines whether a request requires active choices from the player.
 */
export function requiresAction(req: unknown): boolean {
  const kind = classifyRequest(req);
  return kind !== 'none' && kind !== 'wait';
}
