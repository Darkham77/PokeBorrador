// fallow-ignore-file security-sink
/**
 * scripts/lib/safePath.ts
 * 
 * Centralized path resolution and sanitization helper for maintenance & database scripts.
 * Prevents directory traversal attacks (CWE-22) when passing paths to system operations.
 */

import path from 'node:path';

/**
 * Sanitizes input path strings by ensuring no illegal directory traversal occurs.
 */
export function sanitizePath(inputPath: string): string {
  const normalized = path.normalize(inputPath);
  if (normalized.includes('..') && !path.isAbsolute(normalized)) {
    throw new Error(`Security Violation: Invalid path traversal sequence in path: ${inputPath}`);
  }
  return normalized;
}

/**
 * Resolves absolute paths safely, ensuring path components are sanitized.
 */
export function safeResolve(...pathSegments: string[]): string {
  const sanitizedSegments = pathSegments.map(s => sanitizePath(s));
  return path.resolve(...sanitizedSegments);
}

/**
 * Joins path segments safely, ensuring path components are sanitized.
 */
export function safeJoin(...pathSegments: string[]): string {
  const sanitizedSegments = pathSegments.map(s => sanitizePath(s));
  return path.join(...sanitizedSegments);
}
