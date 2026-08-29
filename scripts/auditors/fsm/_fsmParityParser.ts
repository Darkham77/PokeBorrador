// fallow-ignore-file security-sink
import fs from 'node:fs/promises'
import path from 'node:path'

export async function walkSourceFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(res => {
        const resPath = path.resolve(dir, res.name)
        return res.isDirectory() ? walkSourceFiles(resPath) : ['.ts', '.vue'].includes(path.extname(res.name)) ? [resPath] : []
      })
    )
    return files.flat()
  } catch {
    return []
  }
}
