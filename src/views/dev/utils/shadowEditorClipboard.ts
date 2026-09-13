import type { ShadowCalibrationSnapshot } from '@/types/pokemon/spriteShadows';

let sharedMemoryClipboard: number | null = null;
let sharedMemoryCalibration: ShadowCalibrationSnapshot | null = null;

/**
 * Copies a numeric slider value to both the system clipboard and in-memory fallback.
 */
export async function copySliderValue(value: number): Promise<boolean> {
  sharedMemoryClipboard = value;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value.toString());
      return true;
    } catch {
      // In-memory fallback is active
    }
  }
  return true;
}

/**
 * Reads a numeric slider value from the system clipboard, falling back to in-memory storage.
 * Safely parses commas as decimal separators (e.g. '0,55' -> 0.55).
 */
export async function readSliderValue(): Promise<number | null> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text && typeof text === 'string') {
        const clean = text.trim().replace(',', '.');
        const num = parseFloat(clean);
        if (!isNaN(num)) {
          return num;
        }
      }
    } catch {
      // Clipboard permission denied or unavailable, fall back to memory
    }
  }
  return sharedMemoryClipboard;
}

/**
 * Copies all calibration values (X, Y, isFlying, scale) to system clipboard (JSON) and memory.
 */
export async function copyAllValues(snapshot: ShadowCalibrationSnapshot): Promise<boolean> {
  sharedMemoryCalibration = snapshot;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      return true;
    } catch {
      // Memory fallback active
    }
  }
  return true;
}

/**
 * Reads all calibration values from clipboard (JSON or memory fallback).
 */
export async function readAllValues(): Promise<ShadowCalibrationSnapshot | null> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text && typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
          const rawX = typeof parsed.feetX === 'number' ? parsed.feetX : parseFloat(String(parsed.feetX ?? ''));
          const rawY = typeof parsed.feetY === 'number' ? parsed.feetY : parseFloat(String(parsed.feetY ?? ''));
          const rawScale = typeof parsed.shadowScale === 'number' ? parsed.shadowScale : parseFloat(String(parsed.shadowScale ?? ''));

          if (!isNaN(rawX) && !isNaN(rawY)) {
            const feetX = Math.max(0, Math.min(1, Number(rawX.toFixed(3))));
            const feetY = Math.max(0, Math.min(1, Number(rawY.toFixed(3))));
            const shadowScale = isNaN(rawScale) ? 1.0 : Math.max(0.2, Math.min(3.0, Number(rawScale.toFixed(2))));
            const isFlying = Boolean(parsed.isFlying);
            return { feetX, feetY, isFlying, shadowScale };
          }
        }
      }
    } catch {
      // Permission or parse error, fall back to memory
    }
  }
  return sharedMemoryCalibration;
}

/**
 * Retrieves the current in-memory clipboard value without touching navigator.clipboard.
 */
export function getMemoryClipboardValue(): number | null {
  return sharedMemoryClipboard;
}

/**
 * Clears the in-memory clipboard value (useful for testing).
 */
export function clearMemoryClipboard(): void {
  sharedMemoryClipboard = null;
}

/**
 * Retrieves the current in-memory calibration snapshot without touching navigator.clipboard.
 */
export function peekMemoryCalibrationSnapshot(): ShadowCalibrationSnapshot | null {
  return sharedMemoryCalibration;
}

/**
 * Clears the in-memory calibration snapshot (useful for testing).
 */
export function clearMemoryCalibration(): void {
  sharedMemoryCalibration = null;
}
