import type { DisplayText } from '@francogp/auditor';
import { createModalSequenceQueue, type ModalSequenceQueue } from '@francogp/auditor/modals';
import { ref, watch } from 'vue';

import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { logger } from '@/logic/utils/logger';
import { useEventStore } from '@/stores/events';
import { useEvolutionStore } from '@/stores/evolution';
import { useModalStore } from '@/stores/modals';
import { useUIStore } from '@/stores/ui';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

const POST_BATTLE_TASK_TYPES = [
  'move_learning',
  'evolution',
  'event_auto_enroll',
  'custom'
] as const;

export type PostBattleTaskType = (typeof POST_BATTLE_TASK_TYPES)[number];

export interface PostBattleSequenceTask {
  readonly id: DisplayText;
  readonly type: PostBattleTaskType;
  readonly priority: number;
  execute: (ctx: BattleContext) => Promise<void>;
}

export const POST_BATTLE_PRIORITIES = {
  MOVE_LEARNING: 100,
  EVOLUTION: 80,
  EVENT_AUTO_ENROLL: 60,
  CUSTOM: 40
} as const;

export class PostBattleSequenceCoordinator {
  private readonly queue: ModalSequenceQueue<PostBattleTaskType, BattleContext>;
  private readonly stateVersion = ref(0);
  private readonly activeStopHandles = new Set<() => void>();

  public constructor() {
    this.queue = createModalSequenceQueue<PostBattleTaskType, BattleContext>({
      onTaskError: (err, task) => {
        logger.error('PostBattleCoordinator', `Error in post-battle task ${task.taskUid}:`, err);
      }
    });
  }

  public isRunning(): boolean {
    void this.stateVersion.value;
    return this.queue.isRunning();
  }

  public isBusy(): boolean {
    void this.stateVersion.value;
    return this.queue.isBusy();
  }

  public async waitUntilIdle(): Promise<void> {
    await this.queue.waitUntilIdle();
  }

  public getPendingTasks(): readonly PostBattleSequenceTask[] {
    void this.stateVersion.value;
    return this.queue.getPendingTasks().map((entry) => ({
      id: entry.taskUid,
      type: entry.kind,
      priority: entry.priority,
      execute: async (ctx: BattleContext): Promise<void> => {
        await entry.execute(ctx);
      }
    }));
  }

  public clear(): void {
    this.queue.clear();
    for (const stop of this.activeStopHandles) {
      stop();
    }
    this.activeStopHandles.clear();
    this.stateVersion.value++;
  }

  public enqueueTask(task: PostBattleSequenceTask): void {
    this.queue.enqueue({
      taskUid: task.id,
      kind: task.type,
      priority: task.priority,
      execute: async (ctx: BattleContext): Promise<void> => {
        logger.info(
          'PostBattleCoordinator',
          `Executing post-battle task [${task.type}]: ${task.id}`
        );
        await task.execute(ctx);
      }
    });
    this.stateVersion.value++;
  }

  public enqueueMoveLearning(items: { pokemon: Pokemon; move: Move }[]): void {
    if (items.length === 0) return;
    const taskId = `move_learn_${items.map((i) => `${i.pokemon.uid}_${i.move.id}`).join('_')}`;
    this.enqueueTask({
      id: taskId,
      type: 'move_learning',
      priority: POST_BATTLE_PRIORITIES.MOVE_LEARNING,
      execute: async (_ctx: BattleContext) => {
        const uiStore = useUIStore();
        uiStore.addToLearnQueue(items);
        await this.awaitAllModalsOfKindClosed('MoveLearning');
        await this.waitUntilReactiveFalse(
          () => uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn !== null
        );
      }
    });
  }

  public enqueueEvolution(
    pokemon: Pokemon,
    targetId: PokemonSpeciesId,
    itemName: DisplayText = ''
  ): void {
    const taskId = `evo_${pokemon.uid}_to_${targetId}`;
    this.enqueueTask({
      id: taskId,
      type: 'evolution',
      priority: POST_BATTLE_PRIORITIES.EVOLUTION,
      execute: async (_ctx: BattleContext) => {
        const uiStore = useUIStore();
        const evoStore = useEvolutionStore();
        uiStore.startEvolution(pokemon, targetId, itemName);
        await this.awaitAllModalsOfKindClosed('Evolution');
        await this.waitUntilReactiveFalse(() => evoStore.isEvolving);
      }
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
        await eventStore.checkCaptureAndPrompt(pokemon);
        await this.awaitAllModalsOfKindClosed('EventAutoEnroll');
      }
    });
  }

  public async runSequence(ctx: BattleContext): Promise<void> {
    this.stateVersion.value++;
    try {
      await this.queue.runSequence(ctx);
    } finally {
      this.stateVersion.value++;
    }
  }

  private async awaitAllModalsOfKindClosed(kind: DisplayText): Promise<void> {
    const modalStore = useModalStore();
    while (true) {
      const entry = modalStore.stackManager.getLatestByKind(kind, { includeClosing: true });
      if (!entry) break;
      await modalStore.waitForClose(entry.modalUid);
    }
  }

  private waitUntilReactiveFalse(getter: () => boolean): Promise<void> {
    if (!getter()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let settled = false;
      let stopHandle: (() => void) | null = null;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        if (stopHandle) {
          this.activeStopHandles.delete(stopHandle);
          stopHandle();
        }
        resolve();
      };
      const stopWatch = watch(
        getter,
        (active) => {
          if (!active) finish();
        },
        { flush: 'sync' }
      );
      stopHandle = (): void => {
        stopWatch();
        settled = true;
        resolve();
      };
      this.activeStopHandles.add(stopHandle);
      if (!getter()) finish();
    });
  }
}

export const postBattleCoordinator = new PostBattleSequenceCoordinator();
