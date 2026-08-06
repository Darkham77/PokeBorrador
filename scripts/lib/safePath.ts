/**
 * scripts/lib/safePath.ts
 * 
 * Centralized path resolution, sanitization, and URL security helper for maintenance & database scripts.
 * Prevents directory traversal attacks (CWE-22) and SSRF (CWE-918).
 */

import path from 'node:path';
import fs from 'node:fs';

export function sanitizePath(inputPath: string): string {
  const clean = String(inputPath).replace(/(\.\.[\/\\])+/g, '').replace(/[^a-zA-Z0-9_\-\/\.\:\\]/g, '');
  return path.normalize(clean);
}

/**
 * Resolves absolute paths safely within project root boundary.
 */
export function safeResolve(...pathSegments: string[]): string {
  const root = process.cwd();
  const rawPath = pathSegments.filter(Boolean).join('/').replace(/\\/g, '/');
  if (rawPath.includes('..')) {
    throw new Error(`Security Violation CWE-22: Path traversal attempt detected in '${rawPath}'`);
  }
  const cleanSubpath = rawPath.replace(/[^a-zA-Z0-9_\-\/\.\:]/g, '');
  const absolutePath = cleanSubpath.startsWith(root.replace(/\\/g, '/'))
    ? cleanSubpath
    : `${root.replace(/\\/g, '/')}/${cleanSubpath.replace(/^\/+/, '')}`;

  const normalized = path.normalize(absolutePath);
  if (!normalized.toLowerCase().startsWith(root.toLowerCase())) {
    throw new Error(`Security Violation CWE-22: Path '${normalized}' escapes project root '${root}'`);
  }
  return normalized;
}

/**
 * Joins path segments safely within project root boundary.
 */
export function safeJoin(...pathSegments: string[]): string {
  return safeResolve(...pathSegments);
}



/**
 * Safely writes to a file with boundary validation and recursive directory creation.
 */
export function safeWriteFileSync(filePath: string, content: string | Buffer): void {
  const resolved = safeResolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, content);
}

/**
 * Builds a safe local relative URL with query parameters (SSRF Prevention CWE-918).
 */
export function safeDevUrl(endpoint: string, params: Record<string, string> = {}, baseOrigin = 'http://localhost'): string {
  const cleanEndpoint = endpoint.replace(/[^a-zA-Z0-9_\-\/]/g, '');
  const url = new URL(cleanEndpoint, baseOrigin);
  for (const [key, val] of Object.entries(params)) {
    const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanVal = val.replace(/[^a-zA-Z0-9_-]/g, '');
    url.searchParams.set(cleanKey, cleanVal);
  }
  return url.pathname + url.search;
}
