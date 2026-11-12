import type { ModalDismissMode, ModalSingletonPolicy } from '@francogp/auditor/modals';

import type { ModalRegistryKey } from './registry.ts';

export interface ModalMetadata {
  readonly isFullscreen?: boolean;
  readonly obscuresBackground?: boolean;
  readonly dismissMode?: ModalDismissMode;
  readonly singletonPolicy?: ModalSingletonPolicy;
}

export interface ResolveModalDismissModeOptions {
  readonly preventClose: boolean;
  readonly closeOnClickOutside: boolean;
}

const MODAL_METADATA: Partial<Record<ModalRegistryKey, ModalMetadata>> = {
  Confirm: { singletonPolicy: 'ignore-new' },
  Prompt: { singletonPolicy: 'ignore-new' },
  Profile: { obscuresBackground: false },
  MoveLearning: { obscuresBackground: true, dismissMode: 'none' },
  HatchAnimation: { isFullscreen: true, obscuresBackground: true, dismissMode: 'none' },
  Evolution: { isFullscreen: true, obscuresBackground: true, dismissMode: 'none' },
  EncounterSequence: { isFullscreen: true, obscuresBackground: true, dismissMode: 'none' },
  SessionConflict: { isFullscreen: true, obscuresBackground: true, dismissMode: 'none' }
};

export function getModalMetadata(name: string): ModalMetadata | undefined {
  if (Object.hasOwn(MODAL_METADATA, name)) {
    return MODAL_METADATA[name as ModalRegistryKey];
  }
  return undefined;
}

export function resolveModalDismissMode(options: ResolveModalDismissModeOptions): ModalDismissMode {
  if (options.preventClose) return 'none';
  if (!options.closeOnClickOutside) return 'closerequest';
  return 'any';
}
