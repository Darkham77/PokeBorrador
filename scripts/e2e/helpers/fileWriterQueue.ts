// scripts/e2e/helpers/fileWriterQueue.ts
import fs from 'node:fs/promises';
import path from 'node:path';

type WriteTask = {
  filePath: string;
  data: string;
  resolve: () => void;
  reject: (err: unknown) => void;
};

class FileWriterQueue {
  private queue: WriteTask[] = [];
  private isProcessing = false;

  /**
   * Schedules a file write task. Ensures all writes to disk execute
   * sequentially in single-writer FIFO queue order to prevent OS file locking issues.
   */
  async safeWriteFile(filePath: string, data: string): Promise<void> {
    const resolved = path.resolve(process.cwd(), filePath);
    const rel = path.relative(process.cwd(), resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(
        `[FileWriterQueue] Security Error: Path traversal attempt rejected for "${filePath}"`
      );
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ filePath: resolved, data, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const projectRoot = process.cwd();

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        const fileName = path.basename(task.filePath);
        const targetPath = path.resolve(projectRoot, 'scripts', 'e2e', 'results', fileName);

        const relTarget = path.relative(projectRoot, targetPath);
        if (relTarget.startsWith('..') || path.isAbsolute(relTarget)) {
          throw new Error(`[FileWriterQueue] Invalid file target path: ${task.filePath}`);
        }

        const targetDir = path.dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });

        const tmpFileName = `${fileName}.${performance.now().toString().replace('.', '')}.tmp`;
        const tmpFilePath = path.resolve(targetDir, tmpFileName);

        await fs.writeFile(tmpFilePath, task.data, 'utf8');
        await fs.rename(tmpFilePath, targetPath);

        task.resolve();
      } catch (err: unknown) {
        const failure = err instanceof Error ? err : new Error(String(err));
        task.reject(
          new Error(
            `[FileWriterQueue] Atomic publication failed for "${task.filePath}". ` +
              `The previous certified artifact was preserved and no direct-write fallback was attempted. ` +
              `cause=${failure.name}: ${failure.message}`
          )
        );
      }
    }

    this.isProcessing = false;
  }
}

export const fileWriterQueue = new FileWriterQueue();
