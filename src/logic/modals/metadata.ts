export interface ModalMetadata {
  isFullscreen?: boolean;
  obscuresBackground?: boolean;
}

export const MODAL_METADATA: Record<string, ModalMetadata> = {
  HatchAnimation: { isFullscreen: true, obscuresBackground: true },
  Evolution: { isFullscreen: true, obscuresBackground: true },
  EncounterSequence: { isFullscreen: true, obscuresBackground: true }
}
