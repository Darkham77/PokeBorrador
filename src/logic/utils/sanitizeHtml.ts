/**
 * src/logic/utils/sanitizeHtml.ts
 *
 * Client-side HTML sanitization utility for secure rich-text rendering.
 * Strips executable scripts, event handlers, and active frame tags.
 */

const DANGEROUS_CONTENT_REGEX =
  /<\s*(?:script|iframe|object|embed|applet|form|meta|link|style)\b[^<]*(?:(?!<\/(?:script|iframe|object|embed|applet|form|meta|link|style)>)<[^<]*)*<\/(?:script|iframe|object|embed|applet|form|meta|link|style)>|<\s*(?:script|iframe|object|embed|applet|form|meta|link|style)\b[^>]*>|on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi;

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml.replace(DANGEROUS_CONTENT_REGEX, '');
}
