interface ChoiceRequestPokemon {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  stats: { hp: number };
  moves: string[];
  ability: string;
}

export interface ChoiceRequest {
  wait?: boolean;
  teamPreview?: boolean;
  forceSwitch?: Array<unknown> | null;
  active?: Array<{
    trapped?: boolean;
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
}

export type RequestKind = 'none' | 'team-preview' | 'force-switch' | 'move' | 'wait';

/**
 * Classifies a Showdown battle request to determine its action type.
 */
export function classifyRequest(req: unknown): RequestKind {
  if (!req || typeof req !== 'object') return 'none';
  const cReq = req as ChoiceRequest;
  if (cReq.wait) return 'wait';
  if (cReq.teamPreview) return 'team-preview';
  if (cReq.forceSwitch === true || (Array.isArray(cReq.forceSwitch) && cReq.forceSwitch.some(x => !!x))) return 'force-switch';
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
