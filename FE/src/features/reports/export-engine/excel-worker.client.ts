import type { BuildExcelPayload, WorkerExcelResponse } from "./excel-worker.types";
import { downloadExcelBuffer } from "./file-download";

export const exportExcelWithWorker = async (payload: BuildExcelPayload): Promise<void> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./excel.worker.ts", import.meta.url), { type: "module" });

    const cleanup = (): void => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<WorkerExcelResponse>) => {
      const response = event.data;
      cleanup();
      if ("error" in response) {
        reject(new Error(response.error));
        return;
      }
      downloadExcelBuffer(response.buffer, response.fileName);
      resolve();
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "Gagal membuat file Excel di worker"));
    };

    worker.postMessage(payload);
  });
