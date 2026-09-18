import type { ShadowCalibrationSnapshot } from '@/types/pokemon/spriteShadows';
import {
  DEFAULT_SHADOW_SCALE,
  MIN_SHADOW_SCALE,
  MAX_SHADOW_SCALE
} from '@/types/pokemon/spriteShadows';

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
    } catch { // catch-ok: Clipboard permission denied or unavailable, fallback to memory
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
    } catch { // catch-ok: Clipboard permission denied or unavailable, fallback to memory
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
    } catch { // catch-ok: Clipboard permission denied or unavailable, fallback to memory
      // Memory fallback active
    }
  }
  return true;
}

const MIN_FEET_COORD = 0;
const MAX_FEET_COORD = 1;
const COORD_DECIMALS = 3;
const SCALE_DECIMALS = 2;

function parseRawNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  return parseFloat(String(val ?? ''));
}

function clampCoordinate(val: number): number {
  return Math.max(MIN_FEET_COORD, Math.min(MAX_FEET_COORD, Number(val.toFixed(COORD_DECIMALS))));
}

function clampShadowScale(val: number): number {
  if (isNaN(val)) return DEFAULT_SHADOW_SCALE;
  return Math.max(MIN_SHADOW_SCALE, Math.min(MAX_SHADOW_SCALE, Number(val.toFixed(SCALE_DECIMALS))));
}

function parseCalibrationJson(text: string): ShadowCalibrationSnapshot | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    const rawX = parseRawNumber(parsed.feetX);
    const rawY = parseRawNumber(parsed.feetY);
    if (isNaN(rawX) || isNaN(rawY)) {
      return null;
    }
    const rawScale = parseRawNumber(parsed.shadowScale);
    return {
      feetX: clampCoordinate(rawX),
      feetY: clampCoordinate(rawY),
      isFlying: Boolean(parsed.isFlying),
      shadowScale: clampShadowScale(rawScale),
    };
  } catch {
    return null;
  }
}

/**
 * Reads all calibration values from clipboard (JSON or memory fallback).
 */
export async function readAllValues(): Promise<ShadowCalibrationSnapshot | null> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === 'string') {
        const parsed = parseCalibrationJson(text);
        if (parsed) return parsed;
      }
    } catch { // catch-ok: Clipboard permission denied or invalid JSON, fallback to memory
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
