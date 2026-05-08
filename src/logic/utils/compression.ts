
/**
 * Native Compression Utility using CompressionStream API.
 * Optimized for Node 26+ and modern browsers.
 */

export async function compress(data: string | object): Promise<Uint8Array> {
  const json = typeof data === 'string' ? data : JSON.stringify(data)
  const stream = new Blob([json]).stream()
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
  const response = new Response(compressedStream)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

export async function decompress(data: Uint8Array): Promise<string> {
  const stream = new Blob([data] as BlobPart[]).stream()
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
  const response = new Response(decompressedStream)
  return await response.text()
}

/**
 * Validates if a buffer starts with GZIP magic numbers (1f 8b).
 */
export function isGzip(data: Uint8Array): boolean {
  return data.length > 2 && data[0] === 0x1f && data[1] === 0x8b
}
