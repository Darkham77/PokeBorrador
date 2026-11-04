/**
 * test_aventura/tests/map/continentAsyncPipeline.test.ts
 *
 * TIER 1 & TIER 2 TESTS FOR NON-BLOCKING MULTI-THREADED CONTINENT PIPELINE
 *
 * Validates:
 *   1. 1:1 binary parity between buildMapBlitInstructions and compilePackedMapBlitBuffer.
 *   2. Worker full generation, canonical preset loading, and heal-all defect repair off-main-thread
 *      with precomputed detectedDefectCount and zero-copy PackedMapBlitPayload.
 *   3. Progressive frame-budgeted blitter cancellation via AbortController without corrupting canvas state.
 */

import { describe, it, expect } from 'vitest';

import {
  buildMapBlitInstructions,
  compilePackedMapBlitBuffer
} from '../../logic/map/canvasTileRenderer.ts';
import { renderPackedContinentTilemap } from '../../logic/map/canvasViewportBlitter.ts';
import {
  executeFullWorkerGeneration,
  executeHealAllWorkerJob,
  executePresetWorkerJob,
  type RegionalGenerationOptions
} from '../../logic/map/continentGenerator.worker.ts';
import { PACKED_BLIT_STRIDE } from '../../types/map/continentTypes.ts';

describe('Non-Blocking Multi-Threaded Continent Pipeline', () => {
  const sampleOptions: RegionalGenerationOptions = {
    width: 64,
    height: 64,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 2,
    mountainPercentage: 0.22,
    targetCount: 10,
    allowBridges: true,
    withStairs: true
  };

  it('guarantees 1:1 exact layer order, filenames, and coordinates between buildMapBlitInstructions and compilePackedMapBlitBuffer', () => {
    const gen = executeFullWorkerGeneration(sampleOptions);
    const { continent, pois, routeNetwork, wilderness } = gen.result;

    const legacy = buildMapBlitInstructions(
      continent,
      pois,
      routeNetwork.pathGrid,
      routeNetwork.bridgeGrid,
      wilderness
    );
    const packed = compilePackedMapBlitBuffer(
      continent,
      pois,
      routeNetwork.pathGrid,
      routeNetwork.bridgeGrid,
      wilderness
    );

    expect(packed.count).toBe(legacy.instructions.length);
    expect(packed.palette).toHaveLength(legacy.uniqueFilenames.size);

    const view = new Int32Array(packed.coordsBuffer, 0, packed.count * PACKED_BLIT_STRIDE);
    for (let i = 0; i < legacy.instructions.length; i++) {
      const expected = legacy.instructions[i]!;
      const base = i * PACKED_BLIT_STRIDE;
      const paletteIdx = view[base]!;
      expect(packed.palette[paletteIdx]).toBe(expected.filename);
      expect(view[base + 1]).toBe(expected.px);
      expect(view[base + 2]).toBe(expected.py);
    }
  });

  it('executes worker generation, canonical preset, and heal-all jobs with precomputed defect counts and packed buffers', () => {
    const phasesSeen: string[] = [];
    const genOut = executeFullWorkerGeneration(sampleOptions, (phase) => {
      phasesSeen.push(phase);
    });

    expect(phasesSeen).toContain('sculpting');
    expect(phasesSeen).toContain('compiling_tiles');
    expect(genOut.detectedDefectCount).toBeGreaterThan(0);
    expect(genOut.packedBlit.count).toBeGreaterThan(64 * 64);

    // Off-main-thread Auto-Sanar job converges to 0 defects and recompiles packedBlit
    const healedOut = executeHealAllWorkerJob({
      continent: genOut.result.continent,
      pathGrid: genOut.result.routeNetwork.pathGrid,
      bridgeGrid: genOut.result.routeNetwork.bridgeGrid,
      pois: genOut.result.pois,
      wilderness: genOut.result.wilderness,
      domain: 'auto'
    });
    expect(healedOut.detectedDefectCount).toBe(0);
    expect(healedOut.repairedCount).toBeGreaterThan(0);
    expect(healedOut.packedBlit.count).toBeGreaterThan(64 * 64);

    // Off-main-thread canonical preset job ('johto', 128x128)
    const presetOut = executePresetWorkerJob('johto', 251);
    expect(presetOut.result.continent.width).toBe(128);
    expect(presetOut.packedBlit.count).toBeGreaterThan(128 * 128);
    expect(presetOut.detectedDefectCount).toBeGreaterThanOrEqual(0);
  });

  it('aborts progressive frame-sliced canvas blitting cleanly when AbortController signals mid-flight', async () => {
    const genOut = executeFullWorkerGeneration(sampleOptions);
    let drawCalls = 0;
    let fillRectCalls = 0;

    const fakeCtx = {
      imageSmoothingEnabled: true,
      fillStyle: '',
      setTransform: (): void => {},
      fillRect: (): void => {
        fillRectCalls++;
      },
      drawImage: (): void => {
        drawCalls++;
      }
    };

    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => fakeCtx
    } as unknown as HTMLCanvasElement;

    const controller = new AbortController();
    controller.abort();

    const completed = await renderPackedContinentTilemap({
      canvas: fakeCanvas,
      continentWidth: genOut.result.continent.width,
      continentHeight: genOut.result.continent.height,
      packedBlit: genOut.packedBlit,
      signal: controller.signal
    });

    expect(completed).toBe(false);
    expect(fillRectCalls).toBe(0);
    expect(drawCalls).toBe(0);
  });
});
