import type { DisplayText } from '@francogp/auditor';
export interface ModalMetadata {
  isFullscreen?: boolean;
  obscuresBackground?: boolean;
}

export const MODAL_METADATA: Record<DisplayText, ModalMetadata> = {
  // open-record: Modal component name to visual metadata configuration map
  HatchAnimation: { isFullscreen: true, obscuresBackground: true },
  Evolution: { isFullscreen: true, obscuresBackground: true },
  EncounterSequence: { isFullscreen: true, obscuresBackground: true }
};
