import * as engine from './audioEngine.ts';

type SoundDispatcher = (eng: typeof engine, ctx: AudioContext, dest: AudioNode) => void;

const SOUND_DISPATCH_MAP: Record<string, SoundDispatcher> = {
  shiny: (eng, ctx, dest) => eng.playShinySound(ctx, dest),
  rival: (eng, ctx, dest) => eng.playRivalEncounterSound(ctx, dest),
  levelUp: (eng, ctx, dest) => eng.playLevelUpSound(ctx, dest),
  evolution: (eng, ctx, dest) => eng.playEvolutionSound(ctx, dest),
  caught: (eng, ctx, dest) => eng.playCaptureSuccessSound(ctx, dest),
  flee: (eng, ctx, dest) => eng.playFleeSound(ctx, dest),
  item: (eng, ctx, dest) => eng.playItemSound(ctx, dest),
  sentMsg: (eng, ctx, dest) => eng.playMessageSentSound(ctx, dest),
  receivedMsg: (eng, ctx, dest) => eng.playMessageReceivedSound(ctx, dest),
  money: (eng, ctx, dest) => eng.playMoneySound(ctx, dest),
  heal: (eng, ctx, dest) => eng.playHealSound(ctx, dest),
  faint: (eng, ctx, dest) => eng.playFaintSound(ctx, dest),
  wobble: (eng, ctx, dest) => eng.playWobbleSound(ctx, dest),
  ballHit: (eng, ctx, dest) => eng.playBallHitSound(ctx, dest),
  statusDamage: (eng, ctx, dest) => eng.playStatusDamageSound(ctx, dest),
  victoryTrainer: (eng, ctx, dest) => eng.playVictoryTrainerSound(ctx, dest),
  defeat: (eng, ctx, dest) => eng.playDefeatSound(ctx, dest),
  steal: (eng, ctx, dest) => eng.playStealSound(ctx, dest),
  siren: (eng, ctx, dest) => eng.playSirenSound(ctx, dest),
  pvpChallenge: (eng, ctx, dest) => eng.playPvPChallengeSound(ctx, dest),
  criticalThrow: (eng, ctx, dest) => eng.playCriticalThrowSound(ctx, dest),
};

export function dispatchSound(type: string, ctx: AudioContext, dest: AudioNode): void {
  const dispatcher = SOUND_DISPATCH_MAP[type];
  if (dispatcher) {
    dispatcher(engine, ctx, dest);
  }
}
