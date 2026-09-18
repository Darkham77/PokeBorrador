import { ref, type Ref } from 'vue';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import { useEvolutionStore } from '@/stores/evolution';
import { useEventStore } from '@/stores/events';
import { gsapSleep } from '@/logic/utils/gsapHelpers';
import { logger } from '@/logic/utils/logger';

export type PostBattleTaskType = 'move_learning' | 'evolution' | 'event_auto_enroll' | 'custom';

export interface PostBattleSequenceTask {
  readonly id: string;
  readonly type: PostBattleTaskType;
  readonly priority: number;
  execute: (ctx: BattleContext) => Promise<void>;
}

export const POST_BATTLE_PRIORITIES = {
  MOVE_LEARNING: 100,
  EVOLUTION: 80,
  EVENT_AUTO_ENROLL: 60,
  CUSTOM: 40,
} as const;

const MODAL_AWAIT_POLL_INTERVAL_MS = 50;

export class PostBattleSequenceCoordinator {
  private tasks: PostBattleSequenceTask[] = [];
  private _isRunning: Ref<boolean> = ref(false);

  public isRunning(): boolean {
    return this._isRunning.value;
  }

  public isBusy(): boolean {
    return this._isRunning.value || this.tasks.length > 0;
  }

  public async waitUntilIdle(): Promise<void> {
    while (this.isBusy()) {
      await gsapSleep(MODAL_AWAIT_POLL_INTERVAL_MS);
    }
  }

  public getPendingTasks(): readonly PostBattleSequenceTask[] {
    return this.tasks;
  }

  public clear(): void {
    this.tasks = [];
    this._isRunning.value = false;
  }

  public enqueueTask(task: PostBattleSequenceTask): void {
    this.tasks.push(task);
  }

  public enqueueMoveLearning(items: { pokemon: Pokemon; move: Move }[]): void {
    if (items.length === 0) return;
    const taskId = `move_learn_${items.map(i => `${i.pokemon.uid}_${i.move.id}`).join('_')}`;
    this.enqueueTask({
      id: taskId,
      type: 'move_learning',
      priority: POST_BATTLE_PRIORITIES.MOVE_LEARNING,
      execute: async (_ctx: BattleContext) => {
        const uiStore = useUIStore();
        const modalStore = useModalStore();
        uiStore.addToLearnQueue(items);

        while (modalStore.isOpen('MoveLearning') || uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn !== null) {
          await gsapSleep(MODAL_AWAIT_POLL_INTERVAL_MS);
        }
      },
    });
  }

  public enqueueEvolution(pokemon: Pokemon, targetId: PokemonSpeciesId, itemName = ''): void {
    const taskId = `evo_${pokemon.uid}_to_${targetId}`;
    this.enqueueTask({
      id: taskId,
      type: 'evolution',
      priority: POST_BATTLE_PRIORITIES.EVOLUTION,
      execute: async (_ctx: BattleContext) => {
        const uiStore = useUIStore();
        const modalStore = useModalStore();
        const evoStore = useEvolutionStore();
        uiStore.startEvolution(pokemon, targetId, itemName);

        while (modalStore.isOpen('Evolution') || evoStore.isEvolving) {
          await gsapSleep(MODAL_AWAIT_POLL_INTERVAL_MS);
        }
      },
    });
  }

  public enqueueEventAutoEnroll(pokemon: Pokemon): void {
    const taskId = `event_auto_enroll_${pokemon.uid}`;
    this.enqueueTask({
      id: taskId,
      type: 'event_auto_enroll',
      priority: POST_BATTLE_PRIORITIES.EVENT_AUTO_ENROLL,
      execute: async (_ctx: BattleContext) => {
        const eventStore = useEventStore();
        const modalStore = useModalStore();
        await eventStore.checkCaptureAndPrompt(pokemon);

        while (modalStore.isOpen('EventAutoEnroll')) {
          await gsapSleep(MODAL_AWAIT_POLL_INTERVAL_MS);
        }
      },
    });
  }

  public async runSequence(ctx: BattleContext): Promise<void> {
    if (this._isRunning.value) return;
    this._isRunning.value = true;

    try {
      // Sort tasks by priority descending (higher numbers first)
      this.tasks.sort((a, b) => b.priority - a.priority);

      while (this.tasks.length > 0) {
        const nextTask = this.tasks.shift();
        if (!nextTask) break;

        try {
          logger.info('PostBattleCoordinator', `Executing post-battle task [${nextTask.type}]: ${nextTask.id}`);
          await nextTask.execute(ctx);
        } catch (err) {
          logger.error('PostBattleCoordinator', `Error in post-battle task ${nextTask.id}:`, err);
        }
      }
    } finally {
      this._isRunning.value = false;
    }
  }
}

export const postBattleCoordinator = new PostBattleSequenceCoordinator();
