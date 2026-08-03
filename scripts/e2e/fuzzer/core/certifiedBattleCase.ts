import {
  CERTIFIED_BATTLE_WINNERS,
  type CertifiedBattleCase,
  type CertifiedBattleCaseDocument,
  type CertifiedBattleFinalState,
  type CertifiedBattleHistoryEntry,
  type CertifiedPokemonFinalState,
  type TestBatch,
  generateBatchHash,
} from '../generators/fuzzer_team_generator.ts';

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function read(value: object, key: string): unknown {
  return Reflect.get(value, key);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isCertifiedSeed(value: unknown): value is [number, number, number, number] {
  return isNumberArray(value) && value.length === 4;
}

function isArrayOf<T>(value: unknown, guard: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isWinner(value: unknown): value is CertifiedBattleCase['winner'] {
  return typeof value === 'string' && CERTIFIED_BATTLE_WINNERS.some((winner) => winner === value);
}

function isFinalPokemon(value: unknown): value is CertifiedPokemonFinalState {
  return isObject(value)
    && typeof read(value, 'name') === 'string'
    && typeof read(value, 'hp') === 'number'
    && typeof read(value, 'maxHp') === 'number'
    && typeof read(value, 'fainted') === 'boolean';
}

function isFinalState(value: unknown): value is CertifiedBattleFinalState {
  if (!isObject(value)) return false;
  return read(value, 'isOver') === true
    && isWinner(read(value, 'winner'))
    && isArrayOf(read(value, 'p1'), isFinalPokemon)
    && isArrayOf(read(value, 'p2'), isFinalPokemon);
}

function isHistoryEntry(value: unknown): value is CertifiedBattleHistoryEntry {
  return isObject(value)
    && typeof read(value, 'turnCount') === 'number'
    && typeof read(value, 'p1Choice') === 'string'
    && typeof read(value, 'p2Choice') === 'string'
    && typeof read(value, 'battleTurn') === 'number'
    && (read(value, 'p1Heal') === undefined || read(value, 'p1Heal') === true)
    && (read(value, 'p2Heal') === undefined || read(value, 'p2Heal') === true);
}

function projectChoicesFromHistory(
  history: CertifiedBattleHistoryEntry[],
  choiceKey: 'p1Choice' | 'p2Choice',
): string[] {
  return history.flatMap((entry) => {
    const choice = entry[choiceKey];
    return choice !== '' && !choice.startsWith('team') ? [choice] : [];
  });
}

function firstChoiceMismatch(expected: string[], received: string[]): number | null {
  const longestLength = Math.max(expected.length, received.length);
  for (let index = 0; index < longestLength; index++) {
    if (expected[index] !== received[index]) return index;
  }
  return null;
}

function requireChoiceHistoryParity(
  id: string,
  history: CertifiedBattleHistoryEntry[],
  playerChoices: string[],
  enemyChoices: string[],
): void {
  const expectedPlayerChoices = projectChoicesFromHistory(history, 'p1Choice');
  const expectedEnemyChoices = projectChoicesFromHistory(history, 'p2Choice');
  const playerMismatchIndex = firstChoiceMismatch(expectedPlayerChoices, playerChoices);
  const enemyMismatchIndex = firstChoiceMismatch(expectedEnemyChoices, enemyChoices);
  if (playerMismatchIndex === null && enemyMismatchIndex === null) return;

  throw new Error(`[FUZZER-CERTIFICATION] Choice arrays diverge from atomic history. context=${JSON.stringify({
    id,
    historyCount: history.length,
    playerMismatchIndex,
    expectedPlayerChoice: playerMismatchIndex === null ? null : expectedPlayerChoices[playerMismatchIndex],
    receivedPlayerChoice: playerMismatchIndex === null ? null : playerChoices[playerMismatchIndex],
    enemyMismatchIndex,
    expectedEnemyChoice: enemyMismatchIndex === null ? null : expectedEnemyChoices[enemyMismatchIndex],
    receivedEnemyChoice: enemyMismatchIndex === null ? null : enemyChoices[enemyMismatchIndex],
  })}`);
}

function choicesMatchAtomicHistory(
  history: CertifiedBattleHistoryEntry[],
  playerChoices: string[],
  enemyChoices: string[],
): boolean {
  return firstChoiceMismatch(projectChoicesFromHistory(history, 'p1Choice'), playerChoices) === null
    && firstChoiceMismatch(projectChoicesFromHistory(history, 'p2Choice'), enemyChoices) === null;
}

export function isCertifiedBattleCase(value: unknown): value is CertifiedBattleCase {
  if (!isObject(value)) return false;
  const finalState = read(value, 'finalState');
  const history = read(value, 'history');
  const playerChoices = read(value, 'playerChoices');
  const enemyChoices = read(value, 'enemyChoices');
  return typeof read(value, 'id') === 'string'
    && typeof read(value, 'idx') === 'number'
    && Array.isArray(read(value, 'playerTeam'))
    && Array.isArray(read(value, 'enemyTeam'))
    && isStringArray(read(value, 'movesToTest'))
    && isStringArray(read(value, 'abilitiesToTest'))
    && isCertifiedSeed(read(value, 'seed'))
    && isStringArray(playerChoices)
    && isStringArray(enemyChoices)
    && isArrayOf(history, isHistoryEntry)
    && isStringArray(read(value, 'steps'))
    && read(value, 'ended') === true
    && isWinner(read(value, 'winner'))
    && isFinalState(finalState)
    && read(value, 'winner') === read(finalState, 'winner')
    && choicesMatchAtomicHistory(history, playerChoices, enemyChoices);
}

export function isCertifiedBattleCaseDocument(raw: unknown): raw is CertifiedBattleCaseDocument {
  return isObject(raw)
    && Object.keys(raw).length === 1
    && Object.keys(raw)[0] === 'battle'
    && isArrayOf(read(raw, 'battle'), isCertifiedBattleCase);
}

export function requireCertifiedBattleCaseDocument(raw: unknown, source: string): CertifiedBattleCaseDocument {
  if (!isCertifiedBattleCaseDocument(raw)) {
    throw new Error(`[FUZZER-CERTIFICATION] ${source} does not contain a valid certified battle document. Every battle case must include a terminal seed, choices, history, and matching final state.`);
  }
  return raw;
}

export function certifyBattleCase(batch: TestBatch, index: number): CertifiedBattleCase {
  const id = `case-${generateBatchHash(batch)}`;
  const finalState = batch.finalState;
  if (!batch.seed || !isCertifiedSeed(batch.seed)
    || !batch.playerChoices || !batch.enemyChoices || !batch.history
    || !isArrayOf(batch.history, isHistoryEntry)
    || batch.ended !== true || !batch.winner || !finalState
    || !isFinalState(finalState) || finalState.winner !== batch.winner) {
    throw new Error(`[FUZZER-CERTIFICATION] Refusing incomplete replay case: ${JSON.stringify({
      id,
      batch: index,
      seed: batch.seed,
      playerChoiceCount: batch.playerChoices?.length,
      enemyChoiceCount: batch.enemyChoices?.length,
      historyCount: batch.history?.length,
      ended: batch.ended,
      winner: batch.winner,
      finalState,
    })}`);
  }

  requireChoiceHistoryParity(id, batch.history, batch.playerChoices, batch.enemyChoices);

  return {
    id,
    idx: index,
    formatId: batch.formatId,
    playerTeam: batch.playerTeam,
    enemyTeam: batch.enemyTeam,
    movesToTest: batch.movesToTest,
    abilitiesToTest: batch.abilitiesToTest,
    seed: batch.seed,
    playerChoices: batch.playerChoices,
    enemyChoices: batch.enemyChoices,
    history: batch.history,
    steps: batch.steps ?? [],
    ended: true,
    winner: batch.winner,
    finalState,
  };
}
