import { 
  playShinySound, 
  playRivalEncounterSound,
  playHealSound,
  playLevelUpSound,
  playCaptureSuccessSound,
  playFaintSound,
  playEvolutionSound,
  playMessageReceivedSound,
  playMessageSentSound,
  playSocialAlertSound,
  playTradeInviteSound
} from '../audioEngine'

export function initAudioBridge() {
  window.SFX = {
    shiny: playShinySound,
    rivalEncounter: playRivalEncounterSound,
    heal: playHealSound,
    levelUp: playLevelUpSound,
    capture: playCaptureSuccessSound,
    faint: playFaintSound,
    evolution: playEvolutionSound,
    receivedMsg: playMessageReceivedSound,
    sentMsg: playMessageSentSound,
    socialAlert: playSocialAlertSound,
    tradeInvite: playTradeInviteSound,
    // Aliases for convenience
    playShiny: playShinySound,
    playRival: playRivalEncounterSound
  }

  console.log('[AudioBridge] 8-bit sound effects initialized in window.SFX', Object.keys(window.SFX))
}
