export function nextBattleReadyEventKey(lastKey: string, isInputSubState: boolean, eventKey: string): string | null {
  if (!isInputSubState) return ''
  if (lastKey === eventKey) return null
  return eventKey
}
