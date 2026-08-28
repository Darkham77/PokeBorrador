import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAudioStore } from '@/stores/audio';
import * as engine from '@/logic/audio/audioEngine';

describe('Audio Store - Debouncing & Deduplication Shield', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  function setupAudioContextMock() {
    const mockGain = { connect: vi.fn(), gain: { value: 1 } };
    const mockCtx = {
      state: 'running',
      createGain: vi.fn().mockReturnValue(mockGain),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined)
    };
    class MockAudioContext {
      state = 'running';
      createGain = mockCtx.createGain;
      destination = mockCtx.destination;
      resume = mockCtx.resume;
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  }

  it('debounces rapid identical sound calls within 60ms window', async () => {
    setupAudioContextMock();
    const audioStore = useAudioStore();
    const healSpy = vi.spyOn(engine, 'playHealSound').mockImplementation(() => {});

    // First call plays
    await audioStore.play('heal');
    expect(healSpy).toHaveBeenCalledTimes(1);

    // Immediate second call should be ignored
    await audioStore.play('heal');
    expect(healSpy).toHaveBeenCalledTimes(1);

    // Immediate third call should be ignored
    await audioStore.play('heal');
    expect(healSpy).toHaveBeenCalledTimes(1);
  });

  it('allows different sound types to play concurrently without blocking each other', async () => {
    setupAudioContextMock();
    const audioStore = useAudioStore();
    const healSpy = vi.spyOn(engine, 'playHealSound').mockImplementation(() => {});
    const levelUpSpy = vi.spyOn(engine, 'playLevelUpSound').mockImplementation(() => {});

    await audioStore.play('heal');
    await audioStore.play('levelUp');

    expect(healSpy).toHaveBeenCalledTimes(1);
    expect(levelUpSpy).toHaveBeenCalledTimes(1);
  });
});
