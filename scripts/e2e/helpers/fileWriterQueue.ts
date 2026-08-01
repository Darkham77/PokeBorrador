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
    return new Promise((resolve, reject) => {
      this.queue.push({ filePath, data, resolve, reject });
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        const dir = path.dirname(task.filePath);
        await fs.mkdir(dir, { recursive: true });

        const tmpPath = `${task.filePath}.${performance.now().toString().replace('.', '')}.${Math.random().toString(36).substring(2, 8)}.tmp`;
        await fs.writeFile(tmpPath, task.data, 'utf8');
        await fs.rename(tmpPath, task.filePath);

        task.resolve();
      } catch (err: unknown) {
        // Fallback atomic direct write if rename fails cross-device
        try {
          await fs.writeFile(task.filePath, task.data, 'utf8');
          task.resolve();
        } catch (fallbackErr: unknown) {
          task.reject(fallbackErr);
        }
      }
    }

    this.isProcessing = false;
  }
}

export const fileWriterQueue = new FileWriterQueue();
